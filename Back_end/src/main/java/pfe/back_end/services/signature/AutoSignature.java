package pfe.back_end.services.signature;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.services.authentification.ConvertisseurCoordonneesPdf;
import pfe.back_end.services.timestamp.ServiceHorodatage;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.modeles.entites.Document;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AutoSignature {

    @Autowired
    private ImageSignature imageSignature;

    @Autowired
    private ServiceHorodatage serviceHorodatage;

    @Autowired
    private DocumentRepository documentRepository;

    private static final float SIGNATURE_WIDTH = 180;
    private static final float SIGNATURE_HEIGHT = 150;

    /**
     * Auto-signature avec horodatage optionnel et sauvegarde BDD
     * @param documentId ID du document pour sauvegarder l'horodatage (optionnel)
     */
    public byte[] signerDocumentAuto(byte[] pdfBytes, byte[] imageSignatureBytes, String nom,
                                     float x, float y, int pageNumber,
                                     float displayWidth, float displayHeight,
                                     Long documentId) throws Exception {

        // 1. Lire les dimensions du PDF
        PdfReader readerInfo = new PdfReader(new ByteArrayInputStream(pdfBytes));
        PdfDocument pdfDocInfo = new PdfDocument(readerInfo);
        int targetPage = Math.max(1, Math.min(pageNumber, pdfDocInfo.getNumberOfPages()));
        float pdfWidth = pdfDocInfo.getPage(targetPage).getPageSize().getWidth();
        float pdfHeight = pdfDocInfo.getPage(targetPage).getPageSize().getHeight();
        pdfDocInfo.close();

        // 2. Convertir les coordonnées
        float[] coords = convertirCoordonnees(x, y, pdfWidth, pdfHeight, displayWidth, displayHeight);

        // 3. Ajouter l'image de signature
        byte[] pdfSigne = imageSignature.ajouterSignatureImageDepuisByte(pdfBytes, imageSignatureBytes, nom, targetPage, coords[0], coords[1]);

        System.out.println("✅ Auto-signature ajoutée pour: " + nom + " (Page " + targetPage + ")");

        // 4. ✅ HORODATAGE OPTIONNEL AVEC SAUVEGARDE BDD
        if (serviceHorodatage != null && serviceHorodatage.isEnabled()) {
            try {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hashDocument = digest.digest(pdfSigne);
                byte[] tokenHorodatage = serviceHorodatage.getTimestamp(hashDocument);

                if (tokenHorodatage != null) {
                    String tokenBase64 = serviceHorodatage.jetonEnBase64(tokenHorodatage);
                    System.out.println("✅ Horodatage ajouté à l'auto-signature pour: " + nom);

                    // Ajouter les métadonnées au PDF
                    pdfSigne = ajouterHorodatageMetadonnee(pdfSigne, tokenBase64, nom);

                    // Sauvegarder en base de données (optionnel)
                    sauvegarderHorodatageEnBDD(documentId, tokenBase64, hashDocument);

                } else {
                    System.out.println("⚠️ Horodatage non disponible pour auto-signature (optionnel)");
                }
            } catch (Exception e) {
                System.err.println("⚠️ Erreur horodatage (auto-signature, optionnel): " + e.getMessage());
                // Ne pas bloquer l'auto-signature
            }
        } else {
            System.out.println("ℹ️ Service d'horodatage désactivé - Auto-signature sans horodatage");
        }

        return pdfSigne;
    }

    /**
     * Sauvegarde l'horodatage en base de données (optionnel)
     */
    private void sauvegarderHorodatageEnBDD(Long documentId, String tokenBase64, byte[] hashDocument) {
        if (documentId != null && documentRepository != null) {
            try {
                Optional<Document> optDoc = documentRepository.findById(documentId);
                if (optDoc.isPresent()) {
                    Document doc = optDoc.get();
                    doc.setJetonTimestamp(tokenBase64);
                    doc.setDateHorodatage(LocalDateTime.now());
                    documentRepository.save(doc);
                    System.out.println("✅ Horodatage sauvegardé en BDD pour document ID: " + documentId);
                }
            } catch (Exception e) {
                System.err.println("⚠️ Erreur sauvegarde horodatage (non bloquante): " + e.getMessage());
            }
        }
    }

    private float[] convertirCoordonnees(float xFront, float yFront,
                                         float pdfWidth, float pdfHeight,
                                         float frontWidth, float frontHeight) {

        float[] coordsFinales = ConvertisseurCoordonneesPdf.versEspacePdfCentree(
                xFront, yFront, pdfWidth, pdfHeight,
                frontWidth, frontHeight, SIGNATURE_WIDTH, SIGNATURE_HEIGHT
        );

        System.out.println("--- LOGS DE CONVERSION AUTO-SIGNATURE ---");
        System.out.println("Clic Front: (" + xFront + ", " + yFront + ")");
        System.out.println("Position PDF calculée: X=" + coordsFinales[0] + ", Y=" + coordsFinales[1]);

        return coordsFinales;
    }

    /**
     * Ajoute le jeton d'horodatage comme métadonnée dans le PDF
     */
    private byte[] ajouterHorodatageMetadonnee(byte[] pdfBytes, String tokenBase64, String nom) throws Exception {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfReader reader = new PdfReader(bais);
            PdfDocument pdfDoc = new PdfDocument(reader, new PdfWriter(baos));

            Map<String, String> moreInfo = new HashMap<>();
            moreInfo.put("AutoSignatureHorodatageToken", tokenBase64);
            moreInfo.put("AutoSignatureHorodatageDate", LocalDateTime.now().toString());
            moreInfo.put("AutoSignatureHorodatageType", "AUTO");
            moreInfo.put("AutoSignatureNom", nom != null ? nom : "Inconnu");
            moreInfo.put("AutoSignatureVersion", "1.0");

            pdfDoc.getDocumentInfo().setMoreInfo(moreInfo);
            pdfDoc.close();

            return baos.toByteArray();
        }
    }
}