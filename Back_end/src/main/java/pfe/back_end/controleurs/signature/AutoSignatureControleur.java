package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.audit.ServiceAudit;
import pfe.back_end.services.document.ServiceGestionDocuments;
import pfe.back_end.services.signature.AutoSignature;

import java.util.Map;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = "*")
public class AutoSignatureControleur {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private DocumentRepository documentRepository;  // ⭐ AJOUTER CETTE LIGNE

    @Autowired
    private AutoSignature serviceAutoSignature;

    @Autowired
    private ServiceGestionDocuments serviceDocument;

    @Autowired
    private ServiceAudit serviceAudit;  // ⭐ AJOUTER AUSSI POUR L'AUDIT

    @PostMapping("/appliquer-auto-signature")
    @Transactional
    public ResponseEntity<?> AutoSignature(
            @RequestParam("documentId") String documentId,
            @RequestParam("x") float x,
            @RequestParam("y") float y,
            @RequestParam("pageNumber") int page,
            @RequestParam("displayWidth") float displayWidth,
            @RequestParam("displayHeight") float displayHeight,
            Authentication authentication) {
        try {
            // 1. Récupérer l'utilisateur connecté
            Utilisateur user = utilisateurRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // 2. Vérifier si l'utilisateur a une signature enregistrée
            if (user.getImageSignature() == null || user.getImageSignature().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "erreur", "Vous n'avez pas de signature enregistrée. Veuillez d'abord créer votre signature manuscrite dans votre profil."
                ));
            }

            // 3. Récupérer le document original
            Long idConverti = Long.parseLong(documentId);
            byte[] pdfOriginal = serviceDocument.getContenu(idConverti);

            // 4. Récupérer le nom du document pour l'audit
            Document doc = documentRepository.findById(idConverti)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé"));
            String nomDocument = doc.getNomFichier();

            // 5. Préparation de l'image (String -> byte[])
            String base64Image = user.getImageSignature();
            String cleanBase64 = base64Image.contains(",") ? base64Image.split(",")[1] : base64Image;
            byte[] imageBytes = java.util.Base64.getDecoder().decode(cleanBase64);

            // 6. Signature du document
            byte[] pdfSigne = serviceAutoSignature.signerDocumentAuto(
                    pdfOriginal,                    // pdfBytes
                    imageBytes,                     // imageSignatureBytes
                    user.getPrenom() + " " + user.getNom(), // nom
                    x,                              // x
                    y,                              // y
                    page,                           // pageNumber
                    displayWidth,                   // displayWidth
                    displayHeight,                  // displayHeight
                    idConverti                      // documentId
            );

            // 7. Finaliser le document
            Document docFinal = serviceDocument.finaliserSignatureGenerique(idConverti, pdfSigne, user, null);

            // 8. Journaliser l'auto-signature
            serviceAudit.logAutoSignature(
                    user.getId(),
                    user.getEmail(),
                    idConverti,
                    nomDocument,
                    "SUCCESS",
                    "Auto-signature appliquée"
            );

            // 9. Retourner le PDF
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + docFinal.getNomFichier() + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfSigne);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("erreur", "Format d'image invalide : " + e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("erreur", "Erreur technique : " + e.getMessage()));
        }
    }
}