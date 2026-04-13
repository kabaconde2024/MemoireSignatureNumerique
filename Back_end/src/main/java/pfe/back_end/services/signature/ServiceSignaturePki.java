package pfe.back_end.services.signature;

import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.signatures.*;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.services.hsm.ServiceGestionClesHSM;
import pfe.back_end.services.notification.ServiceSmsOtp;
import pfe.back_end.services.authentification.ConvertisseurCoordonneesPdf;
import pfe.back_end.services.timestamp.ServiceHorodatage;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.StatutDocument;

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
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public byte[] signerDocumentPki(byte[] pdfBytes, String nom, String email, String otp,
                                    float x, float y, int pageNumber,
                                    float displayWidth, float displayHeight,
                                    String aliasUtilisateur, Long documentId) throws Exception {

        System.out.println("=== VÉRIFICATION OTP PKI ===");
        
        // 1. Vérification OTP
        if (!serviceSmsOtp.verifyOtp(email, otp)) {
            System.err.println("❌ OTP invalide pour: " + email);
            throw new RuntimeException("Code OTP invalide pour la signature PKI");
        }
        
        System.out.println("✅ OTP valide pour: " + email);

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

        // 4. Exécution de la signature cryptographique (PAdES / CAdES)
        try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfReader reader = new PdfReader(bais);
            PdfSigner signer = new PdfSigner(reader, baos, new StampingProperties().useAppendMode());

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

            IExternalDigest digest = new BouncyCastleDigest();
            IExternalSignature signature = new IExternalSignature() {
                @Override
                public String getHashAlgorithm() { return DigestAlgorithms.SHA256; }

                @Override
                public String getEncryptionAlgorithm() { return "RSA"; }

                @Override
                public byte[] sign(byte[] message) {
                    try {
                        java.security.Signature sig = java.security.Signature.getInstance("SHA256withRSA", serviceHSM.getFournisseurPKCS11());
                        sig.initSign(privateKey);
                        sig.update(message);
                        return sig.sign();
                    } catch (Exception e) {
                        throw new RuntimeException("Échec de la signature matérielle HSM: " + e.getMessage(), e);
                    }
                }
            };

            signer.signDetached(digest, signature, chaineCertificats, null, null, null, 0, PdfSigner.CryptoStandard.CADES);
            pdfSigne = baos.toByteArray();
            System.out.println("✅ Document signé via HSM avec succès.");
        }

        // 5. Horodatage RFC 3161 et Mise à jour BDD
        if (serviceHorodatage != null && serviceHorodatage.isEnabled()) {
            try {
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                byte[] hashDocument = sha256.digest(pdfSigne);
                byte[] tokenHorodatage = serviceHorodatage.getTimestamp(hashDocument);

                if (tokenHorodatage != null) {
                    String tokenBase64 = serviceHorodatage.jetonEnBase64(tokenHorodatage);
                    
                    // On intègre le jeton dans les métadonnées du PDF
                    pdfSigne = integrerHorodatageMetadonnee(pdfSigne, tokenBase64, nom);
                    
                    // ✅ CORRECTION : On passe maintenant pdfSigne pour calculer l'empreinte finale en BDD
                    sauvegarderHorodatageEnBDD(documentId, tokenBase64, pdfSigne);
                    
                    System.out.println("✅ Horodatage appliqué et BDD mise à jour.");
                } else {
                    throw new RuntimeException("Réponse TSA vide");
                }
            } catch (Exception e) {
                System.err.println("⚠️ Erreur Horodatage : " + e.getMessage());
                throw new RuntimeException("La signature PKI requiert un horodatage valide.");
            }
        }

        return pdfSigne;
    }

    /**
     * Met à jour l'entité Document avec le jeton de temps et le HASH final du document.
     */
    private void sauvegarderHorodatageEnBDD(Long documentId, String tokenBase64, byte[] pdfSigne) {
        if (documentId != null) {
            Optional<Document> optDoc = documentRepository.findById(documentId);
            optDoc.ifPresent(doc -> {
                // 1. Infos Horodatage
                doc.setJetonTimestamp(tokenBase64);
                doc.setDateHorodatage(LocalDateTime.now());

                // 2. ✅ CALCUL DE LA SIGNATURE NUMÉRIQUE (Hash final du fichier signé)
                try {
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    byte[] hashBytes = digest.digest(pdfSigne);
                    String hashHex = Hex.toHexString(hashBytes);
                    
                    doc.setSignatureNumerique(hashHex); // Remplissage de la colonne TEXT
                    doc.setHashSha256(hashHex);         // Pour la vérification d'intégrité
                    doc.setEstSigne(true);
                    doc.setStatut(StatutDocument.SIGNE);
                    
                    System.out.println("✅ BDD : Empreinte numérique stockée (" + hashHex + ")");
                } catch (Exception e) {
                    System.err.println("❌ Erreur de hachage final : " + e.getMessage());
                }

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