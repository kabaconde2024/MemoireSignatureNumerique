package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.repositories.sql.InvitationRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = {
    "http://localhost:3000",
    "https://localhost:3000", 
    "https://trustsign-frontend.onrender.com"
}, allowCredentials = "true")
public class SignatureDetailsControleur {

    @Autowired private InvitationRepository invitationRepository;

    @GetMapping("/details/{token}")
    public ResponseEntity<?> getDetails(@PathVariable String token) {
        return invitationRepository.findByTokenSignature(token)
                .map(inv -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("nomDocument", inv.getDocument().getNomFichier());
                    response.put("prenomSignataire", inv.getPrenomSignataire());
                    response.put("nomSignataire", inv.getNomSignataire());
                    response.put("emailDestinataire", inv.getEmailDestinataire());
                    response.put("telephone", inv.getTelephoneSignataire());
                    response.put("statut", inv.getStatut());
                    response.put("typeSignature", inv.getTypeSignature()); // ✅ Déjà présent
                    response.put("coordonneeX", inv.getCoordonneeX());
                    response.put("coordonneeY", inv.getCoordonneeY());
                    response.put("pageNumber", inv.getPageNumber());
                    response.put("dateInvitation", inv.getDateInvitation());  // ✅ Ajouté
                    response.put("dateSignature", inv.getDateSignature());    // ✅ Ajouté
                    response.put("documentId", inv.getDocument().getId());    // ✅ Ajouté
                    response.put("documentNom", inv.getDocument().getNomFichier()); // ✅ Ajouté
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}