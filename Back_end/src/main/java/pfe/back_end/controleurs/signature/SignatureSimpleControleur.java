package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.dto.SignatureRequest;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.services.document.ServiceGestionDocuments;
import pfe.back_end.services.signature.ServiceSignatureSimple;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = "*")
public class SignatureSimpleControleur {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private ServiceSignatureSimple serviceSignatureSimple;

    @Autowired
    private ServiceGestionDocuments serviceDocument;

    @PostMapping("/valider-simple")
    @Transactional
    public ResponseEntity<?> signerSimple(@RequestBody SignatureRequest request) {
        try {
            InvitationSignature inv = invitationRepository.findByTokenSignature(request.getToken())
                    .orElseThrow(() -> new RuntimeException("Invitation invalide"));

            // Récupérer le contenu du document original
            byte[] pdfOriginal = serviceDocument.getContenu(inv.getDocument().getId());

            // ✅ AJOUTER documentId (dernier paramètre)
            byte[] pdfSigne = serviceSignatureSimple.signerDocumentSimple(
                    pdfOriginal,                                    // pdfBytes
                    request.getNom(),                               // nom
                 inv.getEmailDestinataire(), // <--- UTILISER L'EMAIL ICI
                    request.getOtp(),                               // otp
                    request.getX(),                                 // x
                    request.getY(),                                 // y
                    request.getPageNumber(),                        // pageNumber
                    request.getDisplayWidth(),                      // displayWidth
                    request.getDisplayHeight(),                     // displayHeight
                    request.getSignatureImage(),                    // signatureImageBase64
                    inv.getDocument().getId()                       // ✅ documentId (AJOUTÉ)
            );

            // Mettre à jour le statut de l'invitation
            inv.setStatut("SIGNE");
            inv.setDateSignature(LocalDateTime.now());
            inv.setCoordonneeX(request.getX());
            inv.setCoordonneeY(request.getY());
            inv.setPageNumber(request.getPageNumber());
            invitationRepository.save(inv);

            // Sauvegarder le document signé sur disque
            String nouveauNom = "SIGNE_" + inv.getDocument().getNomFichier();
// On passe l'ID du document en premier argument
// CORRECT : On utilise 'doc.getId()' (variable définie ligne 68 de ton code)
String cheminStockage = serviceDocument.sauvegarderSurDisque(doc.getId(), pdfSigne, nouveauNom);
            // Mettre à jour le document original avec la version signée
            Document doc = inv.getDocument();
            doc.setCheminStockage(cheminStockage);
            doc.setEstSigne(true);
            doc.setStatut(pfe.back_end.modeles.entites.StatutDocument.SIGNE);
            documentRepository.save(doc);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nouveauNom + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfSigne);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("erreur", e.getMessage()));
        }
    }
}