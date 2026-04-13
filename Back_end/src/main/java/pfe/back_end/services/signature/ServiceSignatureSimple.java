package pfe.back_end.services.signature;

import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.signatures.PdfSigner;
import com.itextpdf.signatures.PdfSignatureAppearance;
import com.itextpdf.signatures.IExternalSignatureContainer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.services.notification.ServiceSmsOtp;
import pfe.back_end.services.authentification.ConvertisseurCoordonneesPdf;
import pfe.back_end.services.timestamp.ServiceHorodatage;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.StatutDocument;
import java.io.*;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class ServiceSignatureSimple {

    @Autowired
    private ServiceSmsOtp serviceSmsOtp;

    @Autowired
    private ImageSignature imageSignature;

    @Autowired
    private ServiceHorodatage serviceHorodatage;


    @Autowired 
    private DocumentRepository documentRepository;

    private static final float SIGNATURE_WIDTH = 180;
    private static final float SIGNATURE_HEIGHT = 150;

  public byte[] signerDocumentSimple(byte[] pdfBytes, String nom, String tel, String otp,
                                   float x, float y, int pageNumber,
                                   float displayWidth, float displayHeight,
                                   String signatureImageBase64,
                                   Long documentId) throws Exception {

    // 1. Vérification OTP
    if (!serviceSmsOtp.verifyOtp(tel, otp)) {
        throw new RuntimeException("Code OTP invalide");
    }

    // 2. Lire les dimensions du PDF
    PdfReader readerInfo = new PdfReader(new ByteArrayInputStream(pdfBytes));
    PdfDocument pdfDocInfo = new PdfDocument(readerInfo);
    int totalPages = pdfDocInfo.getNumberOfPages();
    int targetPage = Math.max(1, Math.min(pageNumber, totalPages));
    float pdfWidth = pdfDocInfo.getPage(targetPage).getPageSize().getWidth();
    float pdfHeight = pdfDocInfo.getPage(targetPage).getPageSize().getHeight();
    pdfDocInfo.close();

    // 3. Convertir les coordonnées
    float[] coords = convertirCoordonnees(x, y, pdfWidth, pdfHeight, displayWidth, displayHeight);
    float finalX = coords[0];
    float finalY = coords[1];

    // 4. Ajouter l'image de signature
    byte[] pdfWithImage = pdfBytes;
    if (signatureImageBase64 != null && !signatureImageBase64.isEmpty()) {
        pdfWithImage = imageSignature.ajouterSignatureImage(pdfBytes, signatureImageBase64, nom, tel, targetPage, finalX, finalY);
    }

    // 5. Signature numérique (Conteneur vide pour aspect visuel iText)
    byte[] pdfSigne;
    try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfWithImage);
         ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

        PdfReader reader = new PdfReader(bais);
        PdfSigner signer = new PdfSigner(reader, baos, new StampingProperties().useAppendMode());

        Rectangle rect = new Rectangle(finalX, finalY, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
        PdfSignatureAppearance appearance = signer.getSignatureAppearance();
        appearance.setPageRect(rect)
                .setPageNumber(targetPage)
                .setReason("Signé numériquement via TrustSign")
                .setLayer2Text("")
                .setLayer2FontSize(0);

        IExternalSignatureContainer container = new IExternalSignatureContainer() {
            @Override
            public byte[] sign(InputStream data) { return new byte[0]; }
            @Override
            public void modifySigningDictionary(PdfDictionary signDic) {
                signDic.put(PdfName.Filter, PdfName.Adobe_PPKLite);
                signDic.put(PdfName.SubFilter, PdfName.Adbe_pkcs7_detached);
            }
        };

        signer.signExternalContainer(container, 8192);
        pdfSigne = baos.toByteArray();
    }

    // 6. Horodatage
    if (serviceHorodatage.isEnabled()) {
        String token = serviceHorodatage.horodaterDocument(documentId, pdfSigne, "SIMPLE");
        if (token != null) {
            pdfSigne = ajouterHorodatageMetadonnee(pdfSigne, token);
            System.out.println("✅ Horodatage ajouté pour document ID: " + documentId);
        }
    }

    // 7. ✅ CALCUL DU HASH FINAL ET MISE À JOUR BDD
    try {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(pdfSigne);
        String hashHex = org.bouncycastle.util.encoders.Hex.toHexString(hashBytes);

        java.util.Optional<Document> docOpt = documentRepository.findById(documentId);
        if (docOpt.isPresent()) {
            Document doc = docOpt.get();
            doc.setSignatureNumerique(hashHex); // Remplit la colonne signature_numerique
            doc.setHashSha256(hashHex);         // Met à jour l'empreinte d'intégrité
            doc.setEstSigne(true);
            doc.setStatut(StatutDocument.SIGNE);
            documentRepository.save(doc);
            System.out.println("✅ Document ID " + documentId + " marqué comme SIGNE avec Hash.");
        }
    } catch (Exception e) {
        System.err.println("⚠️ Erreur lors de la mise à jour finale : " + e.getMessage());
    }

    return pdfSigne;
}

    private float[] convertirCoordonnees(float xFront, float yFront,
                                         float pdfWidth, float pdfHeight,
                                         float frontWidth, float frontHeight) {
        float[] coordsFinales = ConvertisseurCoordonneesPdf.versEspacePdfCentree(
                xFront, yFront, pdfWidth, pdfHeight, frontWidth, frontHeight,
                SIGNATURE_WIDTH, SIGNATURE_HEIGHT
        );
        return coordsFinales;
    }

    private byte[] ajouterHorodatageMetadonnee(byte[] pdfBytes, String tokenBase64) throws Exception {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfReader reader = new PdfReader(bais);
            PdfDocument pdfDoc = new PdfDocument(reader, new PdfWriter(baos));

            Map<String, String> moreInfo = new HashMap<>();
            moreInfo.put("HorodatageToken", tokenBase64);
            moreInfo.put("HorodatageDate", LocalDateTime.now().toString());
            moreInfo.put("HorodatageType", "SIMPLE");

            pdfDoc.getDocumentInfo().setMoreInfo(moreInfo);
            pdfDoc.close();

            return baos.toByteArray();
        }
    }
}