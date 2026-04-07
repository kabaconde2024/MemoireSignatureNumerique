package pfe.back_end.services.signature;

import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.signatures.*;

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

    /**
     * Signature PKI avec horodatage obligatoire et sauvegarde en BDD
     * @param documentId ID du document pour sauvegarder l'horodatage
     */
    public byte[] signerDocumentPki(byte[] pdfBytes, String nom, String tel, String otp,
                                    float x, float y, int pageNumber,
                                    float displayWidth, float displayHeight,
                                    String aliasUtilisateur, Long documentId) throws Exception {

        // 1. Vérification OTP
        if (!serviceSmsOtp.verifyOtp(tel, otp)) {
            throw new RuntimeException("Code OTP invalide pour la signature PKI");
        }

        // 2. Calcul des dimensions
        byte[] pdfSigne;
        try (PdfReader readerInfo = new PdfReader(new ByteArrayInputStream(pdfBytes));
             PdfDocument pdfDocInfo = new PdfDocument(readerInfo)) {

            int targetPage = Math.max(1, Math.min(pageNumber, pdfDocInfo.getNumberOfPages()));
            float pdfWidth = pdfDocInfo.getPage(targetPage).getPageSize().getWidth();
            float pdfHeight = pdfDocInfo.getPage(targetPage).getPageSize().getHeight();

            float[] coords = ConvertisseurCoordonneesPdf.versEspacePdfCentree(
                    x, y, pdfWidth, pdfHeight, displayWidth, displayHeight, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);

            // 3. Récupérer la clé privée et le certificat
            PrivateKey privateKey = serviceHSM.recupererClePrivee(aliasUtilisateur);
            X509Certificate certificat = serviceHSM.recupererCertificat(aliasUtilisateur);
            Certificate[] chaineCertificats = new Certificate[]{certificat};

            if (privateKey == null || certificat == null) {
                throw new RuntimeException("Certificat ou clé introuvable dans le HSM pour l'alias: " + aliasUtilisateur);
            }

            System.out.println("✅ Clé privée récupérée pour: " + aliasUtilisateur);
            System.out.println("📜 Certificat: " + certificat.getSubjectX500Principal().getName());

            // 4. Signature du PDF
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
                        "Signé numériquement par :\n%s\nDate : %s\nIdentité vérifiée par TrustSign CA",
                        nom, dateStr
                );

                appearance.setLayer2Text(texteSignature);
                appearance.setLayer2FontSize(7);

                IExternalDigest digest = new BouncyCastleDigest();

                final PrivateKey finalPrivateKey = privateKey;

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
                            java.security.Signature sig = java.security.Signature.getInstance("SHA256withRSA");
                            sig.initSign(finalPrivateKey);
                            sig.update(message);
                            return sig.sign();
                        } catch (Exception e) {
                            throw new RuntimeException("Erreur signature HSM: " + e.getMessage(), e);
                        }
                    }
                };

                signer.signDetached(digest, signature, chaineCertificats, null, null, null, 0, PdfSigner.CryptoStandard.CADES);

                System.out.println("✅ Signature PKI réussie pour: " + nom);
                pdfSigne = baos.toByteArray();
            }
        }

        // 5. ✅ HORODATAGE OBLIGATOIRE POUR PKI AVEC SAUVEGARDE BDD
        if (serviceHorodatage != null && serviceHorodatage.isEnabled()) {
            try {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hashDocument = digest.digest(pdfSigne);
                byte[] tokenHorodatage = serviceHorodatage.getTimestamp(hashDocument);

                if (tokenHorodatage != null) {
                    String tokenBase64 = serviceHorodatage.jetonEnBase64(tokenHorodatage);
                    System.out.println("✅ Horodatage PKI ajouté - Alias: " + aliasUtilisateur);

                    // Ajouter les métadonnées au PDF
                    pdfSigne = integrerHorodatageMetadonnee(pdfSigne, tokenBase64, nom);

                    // Sauvegarder en base de données
                    sauvegarderHorodatageEnBDD(documentId, tokenBase64, hashDocument, "PKI");

                } else {
                    throw new RuntimeException("Horodatage requis pour signature PKI mais indisponible");
                }
            } catch (Exception e) {
                throw new RuntimeException("Erreur horodatage obligatoire pour PKI: " + e.getMessage());
            }
        } else if (serviceHorodatage == null || !serviceHorodatage.isEnabled()) {
            throw new RuntimeException("Service d'horodatage non disponible - Signature PKI impossible");
        }

        return pdfSigne;
    }

    /**
     * Sauvegarde l'horodatage en base de données
     */
    private void sauvegarderHorodatageEnBDD(Long documentId, String tokenBase64, byte[] hashDocument, String typeSignature) {
        if (documentId != null && documentRepository != null) {
            try {
                Optional<Document> optDoc = documentRepository.findById(documentId);
                if (optDoc.isPresent()) {
                    Document doc = optDoc.get();
                    doc.setJetonTimestamp(tokenBase64);
                    doc.setDateHorodatage(LocalDateTime.now());
                    documentRepository.save(doc);
                    System.out.println("✅ Horodatage sauvegardé en BDD pour document ID: " + documentId);
                } else {
                    System.out.println("⚠️ Document non trouvé pour sauvegarde horodatage - ID: " + documentId);
                }
            } catch (Exception e) {
                System.err.println("❌ Erreur sauvegarde horodatage BDD: " + e.getMessage());
            }
        }
    }

    /**
     * Intègre le jeton d'horodatage dans les métadonnées du PDF pour PKI
     */
    private byte[] integrerHorodatageMetadonnee(byte[] pdfBytes, String tokenBase64, String nom) throws Exception {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfReader reader = new PdfReader(bais);
            PdfDocument pdfDoc = new PdfDocument(reader, new PdfWriter(baos));

            Map<String, String> moreInfo = new HashMap<>();
            moreInfo.put("PKIHorodatageToken", tokenBase64);
            moreInfo.put("PKIHorodatageDate", LocalDateTime.now().toString());
            moreInfo.put("PKIHorodatageType", "PKI_QUALIFIED");
            moreInfo.put("PKISignataire", nom != null ? nom : "Inconnu");
            moreInfo.put("PKIVersion", "1.0");

            pdfDoc.getDocumentInfo().setMoreInfo(moreInfo);
            pdfDoc.close();

            return baos.toByteArray();
        }
    }
}