package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"https://localhost:3000", "https://trustsign-frontend.onrender.com"}, allowCredentials = "true")
public class ImageSignatureControleur {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @PostMapping("/utilisateur/sauvegarder-signature")
    public ResponseEntity<?> sauvegarderSignatureAuto(@RequestBody Map<String, String> payload, Authentication authentication) {
        String email = authentication.getName();
        String base64Image = payload.get("imageSignature");

        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        user.setImageSignature(base64Image);
        utilisateurRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Signature mise à jour avec succès"));
    }
}