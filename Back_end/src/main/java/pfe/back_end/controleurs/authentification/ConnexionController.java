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
import pfe.back_end.dto.ReponseAuthentification;
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
    "https://memoire-frontend.onrender.com"
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

    /**
     * Connexion standard par email/password
     */
    @PostMapping("/connexion")
    public ResponseEntity<?> connexion(@RequestBody RequeteConnexion request) {
        try {
            ReponseAuthentification reponse = connexionService.connecter(request);
            
            // 1. Récupération du token
            String jwt = reponse.getAccessToken(); 

            // 2. Création du cookie sécurisé pour le Cross-Domain (Render)
            ResponseCookie cookie = ResponseCookie.from("accessToken", jwt)
                    .httpOnly(true)
                    .secure(true)    // Obligatoire pour HTTPS sur Render
                    .sameSite("None") // Obligatoire pour les domaines différents
                    .path("/")
                    .maxAge(3600)
                    .build();

            serviceAudit.logConnexion(request.getEmail(), true, "Connexion réussie", httpServletRequest);

            // 3. Retour de la réponse avec le Cookie Set-Cookie
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(reponse); 
        } catch (Exception e) {
            serviceAudit.logConnexion(request.getEmail(), false, e.getMessage(), httpServletRequest);
            return ResponseEntity.status(401).body(Map.of("erreur", e.getMessage()));
        }
    }

    /**
     * Connexion via Google OAuth2
     */
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

                // Cookie identique pour Google
                ResponseCookie googleCookie = ResponseCookie.from("accessToken", jwt)
                        .httpOnly(true)
                        .secure(true)
                        .sameSite("None")
                        .path("/")
                        .maxAge(3600)
                        .build();

                Map<String, Object> reponseBody = new HashMap<>();
                reponseBody.put("role", roleName);
                reponseBody.put("email", user.getEmail());
                reponseBody.put("userId", user.getId());
                reponseBody.put("prenom", user.getPrenom());
                reponseBody.put("nom", user.getNom());
                reponseBody.put("statut", user.getStatutCycleVie());

                serviceAudit.logConnexion(email, true, "Connexion Google réussie", httpServletRequest);

                return ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, googleCookie.toString())
                        .body(reponseBody);
            }
            return ResponseEntity.status(401).body(Map.of("erreur", "Authentification Google invalide"));
        } catch (Exception e) {
            serviceAudit.logConnexion(null, false, "Erreur Google: " + e.getMessage(), httpServletRequest);
            return ResponseEntity.status(401).body(Map.of("erreur", e.getMessage()));
        }
    }

    /**
     * Déconnexion par suppression du cookie
     */
    @PostMapping("/deconnexion")
    public ResponseEntity<?> deconnexion() {
        ResponseCookie cookie = ResponseCookie.from("accessToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(0) // Expire immédiatement
                .build();
                
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("message", "Déconnecté."));
    }

    /**
     * Vérification silencieuse de la validité de la session (utilisé par React au refresh)
     */
    @GetMapping("/auth/check")
    public ResponseEntity<?> verifierSession(HttpServletRequest request) {
        String token = recupererJwtDepuisCookie(request);
        if (token == null || !jwtUtils.validateToken(token)) {
            return ResponseEntity.ok(Map.of("authentifie", false));
        }
        return ResponseEntity.ok(Map.of(
            "authentifie", true, 
            "role", jwtUtils.getRoleFromToken(token),
            "email", jwtUtils.getEmailFromToken(token)
        ));
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