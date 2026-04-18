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
@CrossOrigin(origins = {
    "http://localhost:3000", 
    "https://trustsign-frontend.onrender.com"
}, allowCredentials = "true")
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
            // 1. Récupérer l'invitation à partir du token
            InvitationSignature inv = invitationRepository.findByTokenSignature(request.getToken())
                    .orElseThrow(() -> new RuntimeException("Invitation invalide"));

            // 2. Initialiser la variable 'doc' dès maintenant pour pouvoir l'utiliser partout
            Document doc = inv.getDocument();

            // 3. Récupérer le contenu du document original
            byte[] pdfOriginal = serviceDocument.getContenu(doc.getId());

            // 4. Exécuter la signature technique
            byte[] pdfSigne = serviceSignatureSimple.signerDocumentSimple(
                    pdfOriginal,                                    // pdfBytes
                    request.getNom(),                               // nom
                    inv.getEmailDestinataire(),                     // email (depuis l'invitation)
                    request.getOtp(),                               // otp
                    request.getX(),                                 // x
                    request.getY(),                                 // y
                    request.getPageNumber(),                        // pageNumber
                    request.getDisplayWidth(),                      // displayWidth
                    request.getDisplayHeight(),                     // displayHeight
                    request.getSignatureImage(),                    // signatureImageBase64
                    doc.getId()                                     // documentId
            );

            // 5. Mettre à jour le statut de l'invitation
            inv.setStatut("SIGNE");
            inv.setDateSignature(LocalDateTime.now());
            inv.setCoordonneeX(request.getX());
            inv.setCoordonneeY(request.getY());
            inv.setPageNumber(request.getPageNumber());
            invitationRepository.save(inv);

            // 6. Sauvegarder le document signé
            String nouveauNom = "SIGNE_" + doc.getNomFichier();
            
            // ✅ CORRECTION : 'doc' est maintenant bien défini avant cet appel
            String cheminStockage = serviceDocument.sauvegarderSurDisque(doc.getId(), pdfSigne, nouveauNom);

            // 7. Mettre à jour les métadonnées du document original
            doc.setCheminStockage(cheminStockage);
            doc.setEstSigne(true);
            doc.setStatut(pfe.back_end.modeles.entites.StatutDocument.SIGNE);
            documentRepository.save(doc);

            // 8. Retourner le fichier PDF signé
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