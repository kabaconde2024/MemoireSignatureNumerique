package pfe.back_end.controleurs.authentification;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.configuration.ServiceJwt;
import pfe.back_end.dto.RequeteConnexion;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.audit.ServiceAudit;
import pfe.back_end.services.authentification.ActivationCompte;
import pfe.back_end.services.authentification.Connexion;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;


@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://memoire-frontend.onrender.com"  // ← AJOUTEZ CETTE LIGNE
}, allowCredentials = "true")
public class ConnexionController {

    @Autowired
    private ActivationCompte serviceInscriptionPublic;

    @Autowired
    private ServiceJwt jwtUtils;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private Connexion connexionService;

    @Autowired
    private ServiceAudit serviceAudit;

    @Autowired
    private HttpServletRequest httpServletRequest;

    @PostMapping("/connexion")
    public ResponseEntity<?> connexion(@RequestBody RequeteConnexion request) {
        try {
            pfe.back_end.modeles.dto.ReponseAuthentification reponse = connexionService.connecter(request);            // ✅ Journaliser la connexion réussie (AVANT le return)
            serviceAudit.logConnexion(request.getEmail(), true, "Connexion réussie", httpServletRequest);
            return ResponseEntity.ok(reponse);
        } catch (Exception e) {
            // ✅ Journaliser l'échec de connexion
            serviceAudit.logConnexion(request.getEmail(), false, e.getMessage(), httpServletRequest);
            return ResponseEntity.status(401).body(Map.of("erreur", e.getMessage()));
        }
    }

    @PostMapping("/auth/google")
    public ResponseEntity<?> authenticateGoogleUser(@RequestBody Map<String, String> payload, HttpServletResponse response) {
        try {
            String idTokenString = payload.get("token");
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList("320659477478-00hgntilql2f933lr33go2tie7b5em2u.apps.googleusercontent.com"))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                String email = idToken.getPayload().getEmail();
                Utilisateur user = utilisateurRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("Compte Google non reconnu."));

                String roleName = (user.getRole() != null) ? user.getRole().name() : "UTILISATEUR";
                String jwt = jwtUtils.generateToken(user.getEmail(), roleName);

                ResponseCookie googleCookie = ResponseCookie.from("accessToken", jwt)
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

                // ✅ Journaliser la connexion Google réussie
                serviceAudit.logConnexion(email, true, "Connexion Google réussie", httpServletRequest);

                return ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, googleCookie.toString())
                        .body(reponse);
            }
            return ResponseEntity.status(401).body(Map.of("erreur", "Authentification Google invalide"));
        } catch (Exception e) {
            // ✅ Journaliser l'échec de connexion Google
            serviceAudit.logConnexion(null, false, "Erreur Google: " + e.getMessage(), httpServletRequest);
            return ResponseEntity.status(401).body(Map.of("erreur", e.getMessage()));
        }
    }

    @PostMapping("/deconnexion")
    public ResponseEntity<?> deconnexion(HttpServletResponse response) {
        Cookie cookie = new Cookie("accessToken", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Déconnecté."));
    }

    private String recupererJwtDepuisCookie(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) return cookie.getValue();
            }
        }
        return null;
    }

    @GetMapping("/auth/check")
    public ResponseEntity<?> verifierSession(HttpServletRequest request) {
        String token = recupererJwtDepuisCookie(request);
        if (token == null || !jwtUtils.validateToken(token)) return ResponseEntity.ok(Map.of("authentifie", false));
        return ResponseEntity.ok(Map.of("authentifie", true, "role", jwtUtils.getRoleFromToken(token)));
    }
}