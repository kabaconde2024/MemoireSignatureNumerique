package pfe.back_end.services.signature;

import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.signatures.*;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.services.hsm.ServiceGestionClesHSM;
import pfe.back_end.services.notification.ServiceSmsOtp;
import pfe.back_end.services.authentification.ConvertisseurCoordonneesPdf;
import pfe.back_end.services.timestamp.ServiceHorodatage;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.modeles.entites.Document;

import java.io.*;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Security;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class ServiceSignaturePki {

    @Autowired
    private ServiceSmsOtp serviceSmsOtp;

    @Autowired
    private ServiceGestionClesHSM serviceHSM;

    @Autowired
    private ServiceHorodatage serviceHorodatage;

    @Autowired
    private DocumentRepository documentRepository;

    private static final float SIGNATURE_WIDTH = 180;
    private static final float SIGNATURE_HEIGHT = 80;

    static {
        // Ajout de BouncyCastle si non présent pour les opérations de hashage iText
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public byte[] signerDocumentPki(byte[] pdfBytes, String nom, String tel, String otp,
                                    float x, float y, int pageNumber,
                                    float displayWidth, float displayHeight,
                                    String aliasUtilisateur, Long documentId) throws Exception {

        // 1. Vérification OTP
        if (!serviceSmsOtp.verifyOtp(tel, otp)) {
            throw new RuntimeException("Code OTP invalide pour la signature PKI");
        }

        // 2. Préparation des coordonnées
        float[] coords;
        int targetPage;
        try (PdfReader readerInfo = new PdfReader(new ByteArrayInputStream(pdfBytes));
             PdfDocument pdfDocInfo = new PdfDocument(readerInfo)) {
            
            targetPage = Math.max(1, Math.min(pageNumber, pdfDocInfo.getNumberOfPages()));
            float pdfWidth = pdfDocInfo.getPage(targetPage).getPageSize().getWidth();
            float pdfHeight = pdfDocInfo.getPage(targetPage).getPageSize().getHeight();

            coords = ConvertisseurCoordonneesPdf.versEspacePdfCentree(
                    x, y, pdfWidth, pdfHeight, displayWidth, displayHeight, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
        }

        // 3. Récupération de l'identité depuis le HSM
        PrivateKey privateKey = serviceHSM.recupererClePrivee(aliasUtilisateur);
        X509Certificate certificat = serviceHSM.recupererCertificat(aliasUtilisateur);

        if (privateKey == null || certificat == null) {
            throw new RuntimeException("Identité numérique introuvable dans le HSM pour l'alias: " + aliasUtilisateur);
        }

        Certificate[] chaineCertificats = new Certificate[]{certificat};
        byte[] pdfSigne;

        // 4. Exécution de la signature cryptographique
        try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfReader reader = new PdfReader(bais);
            // Utilisation du mode Append pour conserver l'intégrité incrémentale
            PdfSigner signer = new PdfSigner(reader, baos, new StampingProperties().useAppendMode());

            // Configuration de l'apparence visuelle
            Rectangle rect = new Rectangle(coords[0], coords[1], SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
            PdfSignatureAppearance appearance = signer.getSignatureAppearance();

            appearance.setPageRect(rect)
                    .setPageNumber(targetPage)
                    .setReason("Signature électronique qualifiée (ISO 27005)")
                    .setLocation("Gabès, Tunisie")
                    .setSignatureCreator("TrustSign PKI Infrastructure");

            String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            String texteSignature = String.format(
                    "Signé numériquement par :\n%s\nDate : %s\nIdentité vérifiée via SoftHSM2",
                    nom, dateStr
            );

            appearance.setLayer2Text(texteSignature);
            appearance.setLayer2FontSize(7);

            // Implémentation iText liée au Provider PKCS11 (CORRECTION PRODUCTION)
            IExternalDigest digest = new BouncyCastleDigest();
            IExternalSignature signature = new IExternalSignature() {
                @Override
                public String getHashAlgorithm() {
                    return DigestAlgorithms.SHA256;
                }

                @Override
                public String getEncryptionAlgorithm() {
                    return "RSA";
                }

                @Override
                public byte[] sign(byte[] message) {
                    try {
                        // FORCE l'utilisation du provider SunPKCS11 initialisé dans ServiceGestionClesHSM
                        java.security.Signature sig = java.security.Signature.getInstance("SHA256withRSA", serviceHSM.getFournisseurPKCS11());
                        sig.initSign(privateKey);
                        sig.update(message);
                        return sig.sign();
                    } catch (Exception e) {
                        throw new RuntimeException("Échec de la signature matérielle HSM: " + e.getMessage(), e);
                    }
                }
            };

            // Signature détachée selon le standard CAdES
            signer.signDetached(digest, signature, chaineCertificats, null, null, null, 0, PdfSigner.CryptoStandard.CADES);
            pdfSigne = baos.toByteArray();
            System.out.println("✅ Document signé via HSM avec succès.");
        }

        // 5. Horodatage de Production
        if (serviceHorodatage != null && serviceHorodatage.isEnabled()) {
            try {
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                byte[] hashDocument = sha256.digest(pdfSigne);
                byte[] tokenHorodatage = serviceHorodatage.getTimestamp(hashDocument);

                if (tokenHorodatage != null) {
                    String tokenBase64 = serviceHorodatage.jetonEnBase64(tokenHorodatage);
                    
                    // Métadonnées & BDD
                    pdfSigne = integrerHorodatageMetadonnee(pdfSigne, tokenBase64, nom);
                    sauvegarderHorodatageEnBDD(documentId, tokenBase64);
                    System.out.println("✅ Horodatage RFC 3161 appliqué.");
                } else {
                    throw new RuntimeException("Réponse TSA vide");
                }
            } catch (Exception e) {
                System.err.println("⚠️ Alerte Horodatage : " + e.getMessage());
                throw new RuntimeException("La signature PKI requiert un horodatage valide.");
            }
        }

        return pdfSigne;
    }

    private void sauvegarderHorodatageEnBDD(Long documentId, String tokenBase64) {
        if (documentId != null) {
            Optional<Document> optDoc = documentRepository.findById(documentId);
            optDoc.ifPresent(doc -> {
                doc.setJetonTimestamp(tokenBase64);
                doc.setDateHorodatage(LocalDateTime.now());
                documentRepository.save(doc);
            });
        }
    }

    private byte[] integrerHorodatageMetadonnee(byte[] pdfBytes, String tokenBase64, String nom) throws Exception {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfReader reader = new PdfReader(bais);
            PdfDocument pdfDoc = new PdfDocument(reader, new PdfWriter(baos));

            Map<String, String> moreInfo = new HashMap<>();
            moreInfo.put("PKI_Timestamp_Token", tokenBase64);
            moreInfo.put("PKI_Signataire", nom);
            moreInfo.put("PKI_Status", "QUALIFIED");

            pdfDoc.getDocumentInfo().setMoreInfo(moreInfo);
            pdfDoc.close();
            return baos.toByteArray();
        }
    }
}