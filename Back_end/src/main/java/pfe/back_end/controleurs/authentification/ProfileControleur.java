package pfe.back_end.controleurs.authentification;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pfe.back_end.configuration.ServiceJwt;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;

import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "https://localhost:3000", allowCredentials = "true")
public class ProfileControleur {

    @Autowired
    private ServiceJwt jwtUtils;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @GetMapping("/utilisateur/mon-profil")
    public ResponseEntity<?> getMonProfil(HttpServletRequest request) {
        try {
            String token = recupererJwtDepuisCookie(request);
            if (token == null) return ResponseEntity.status(401).body(Map.of("erreur", "Non autorisé"));

            String email = jwtUtils.getEmailFromToken(token);
            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("email", user.getEmail());
            userData.put("prenom", user.getPrenom());
            userData.put("nom", user.getNom());
            userData.put("telephone", user.getTelephone());
            userData.put("role", user.getRole().name());
            userData.put("statut", user.getStatutCycleVie());
            userData.put("statutCompte", user.getStatutCycleVie());

            // ✅ Ajouter la photo de profil
            if (user.getPhotoProfil() != null && !user.getPhotoProfil().isEmpty()) {
                userData.put("photoProfil", user.getPhotoProfil());
            } else {
                userData.put("photoProfil", null);
            }

            // ✅ Ajouter la signature
            if (user.getImageSignature() != null && !user.getImageSignature().isEmpty()) {
                userData.put("imageSignature", user.getImageSignature());
            } else {
                userData.put("imageSignature", null);
            }

            String statusPki = user.getStatusPki();
            if (statusPki == null || statusPki.isEmpty()) {
                statusPki = "NONE";
            }
            userData.put("status_pki", statusPki);
            userData.put("hsmAlias", user.getHsmAlias());

            return ResponseEntity.ok(userData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("erreur", e.getMessage()));
        }
    }

    @PutMapping("/utilisateur/modifier-profil")
    public ResponseEntity<?> updateProfil(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        try {
            String token = recupererJwtDepuisCookie(request);
            if (token == null) return ResponseEntity.status(401).body(Map.of("erreur", "Session expirée"));

            String email = jwtUtils.getEmailFromToken(token);
            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            if (payload.containsKey("prenom")) user.setPrenom(payload.get("prenom"));
            if (payload.containsKey("nom")) user.setNom(payload.get("nom"));
            if (payload.containsKey("telephone")) user.setTelephone(payload.get("telephone"));

            // ✅ Ajouter la mise à jour de la photo de profil
            if (payload.containsKey("photoProfil")) {
                String photoProfil = payload.get("photoProfil");
                if (photoProfil != null && !photoProfil.isEmpty()) {
                    user.setPhotoProfil(photoProfil);
                }
            }

            utilisateurRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Profil mis à jour avec succès !"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("erreur", "Erreur lors de la mise à jour : " + e.getMessage()));
        }
    }

    // ✅ Endpoint spécifique pour uploader une photo de profil
    @PostMapping("/utilisateur/upload-photo")
    public ResponseEntity<?> uploadPhoto(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        try {
            String token = recupererJwtDepuisCookie(request);
            if (token == null) return ResponseEntity.status(401).body(Map.of("erreur", "Non autorisé"));

            String email = jwtUtils.getEmailFromToken(token);
            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            String photoBase64 = payload.get("photo");
            if (photoBase64 == null || photoBase64.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Aucune photo fournie"));
            }

            user.setPhotoProfil(photoBase64);
            utilisateurRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Photo de profil mise à jour avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

    private String recupererJwtDepuisCookie(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) return cookie.getValue();
            }
        }
        return null;
    }
}