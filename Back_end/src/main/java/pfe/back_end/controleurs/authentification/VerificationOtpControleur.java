package pfe.back_end.controleurs.authentification;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.configuration.ServiceJwt;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.authentification.ValidationOtp;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://memoire-frontend.onrender.com"  // ← AJOUTEZ CETTE LIGNE
}, allowCredentials = "true")


public class VerificationOtpControleur {

    @Autowired
    private ValidationOtp validationOtpService;

    @Autowired
    private ServiceJwt jwtUtils;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @PostMapping("/verifier-otp")
    public ResponseEntity<?> verifierOtp(@RequestBody Map<String, String> request, HttpServletResponse response) {
        String email = request.get("email");
        String code = request.get("code");

        // Correction: utiliser validationOtpService au lieu de ServiceAuthentification
        if (validationOtpService.validerOTP(email, code)) {
            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            String roleName = (user.getRole() != null) ? user.getRole().name() : "UTILISATEUR";
            String token = jwtUtils.generateToken(user.getEmail(), roleName);

            ResponseCookie springCookie = ResponseCookie.from("accessToken", token)
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("None")
                    .path("/")
                    .maxAge(3600)
                    .build();

            Map<String, Object> reponse = new HashMap<>();
            reponse.put("role", roleName);
            reponse.put("email", user.getEmail());
            reponse.put("userId", user.getId());
            reponse.put("prenom", user.getPrenom());
            reponse.put("nom", user.getNom());
            reponse.put("statut", user.getStatutCycleVie());


            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, springCookie.toString())
                    .body(reponse);
        }
        return ResponseEntity.status(401).body(Map.of("erreur", "Code MFA invalide ou expiré"));
    }
}