package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.services.document.ServiceGestionDocuments;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = {
    "http://localhost:3000",
    "https://localhost:3000", 
    "https://trustsign-frontend.onrender.com"
}, allowCredentials = "true")
public class SignatureApercuControleur {

    @Autowired 
    private InvitationRepository invitationRepository;
    
    @Autowired
    private ServiceGestionDocuments serviceGestionDocuments;

    @GetMapping("/apercu/{token}")
    public ResponseEntity<byte[]> apercu(@PathVariable String token) {
        try {
            System.out.println("=== APERÇU DOCUMENT ===");
            System.out.println("Token reçu: " + token);
            
            // 1. Récupérer l'invitation
            InvitationSignature invitation = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation introuvable"));
            
            System.out.println("Document ID: " + invitation.getDocument().getId());
            System.out.println("Document nom: " + invitation.getDocument().getNomFichier());
            
            // 2. Récupérer le contenu du document depuis la BDD
            byte[] pdfBytes = serviceGestionDocuments.getContenu(invitation.getDocument().getId());
            
            if (pdfBytes == null || pdfBytes.length == 0) {
                System.out.println("❌ Contenu PDF null ou vide pour document ID: " + invitation.getDocument().getId());
                return ResponseEntity.notFound().build();
            }
            
            System.out.println("✅ PDF chargé, taille: " + pdfBytes.length + " bytes");
            
            // 3. Retourner le PDF pour visualisation inline
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + invitation.getDocument().getNomFichier() + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
                    
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'aperçu: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
}