package pfe.back_end.controleurs.authentification;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.Role;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.audit.ServiceAudit;
import pfe.back_end.services.authentification.Inscription;
import pfe.back_end.services.notification.ServiceNotification;

import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://memoire-frontend.onrender.com"  // ← AJOUTEZ CETTE LIGNE
}, allowCredentials = "true")
public class InscriptionController {

    @Autowired
    private Inscription inscriptions;


    @Autowired
    private ServiceNotification emailService; // Injection ajoutée pour corriger l'erreur


    @Autowired
    private UtilisateurRepository utilisateurRepository;


    @Autowired
    private ServiceAudit serviceAudit;
    @Autowired
    private HttpServletRequest httpServletRequest;


  @PostMapping("/auth/demande-inscription")
public ResponseEntity<?> demandeInscription(@RequestBody Map<String, String> request) {
    String email = request.get("email").trim().toLowerCase();

    if (utilisateurRepository.existsByEmail(email)) {
        return ResponseEntity.badRequest().body(Map.of("erreur", "Cet email est déjà utilisé."));
    }

    String token = UUID.randomUUID().toString();

    try {
        emailService.envoyerLienFinalisation(email, token);
        return ResponseEntity.ok(Map.of("message", "Un lien de finalisation a été envoyé."));
    } catch (Exception e) {
        // LOG L'ERREUR MAIS NE BLOQUE PAS L'UTILISATEUR
        System.err.println("Erreur SMTP : " + e.getMessage());
        
        // ASTUCE POUR TA SOUTENANCE :
        // On renvoie un succès avec le lien directement pour que tu puisses continuer la démo !
        String lienManuel = "https://memoire-frontend.onrender.com/finaliser-inscription?token=" + token + "&email=" + email;
        
        return ResponseEntity.ok(Map.of(
            "message", "L'email n'a pas pu être envoyé (blocage réseau), mais vous pouvez continuer ici :",
            "lienDemo", lienManuel
        ));
    }
}


    @PostMapping("/auth/finaliser-inscription")
    public ResponseEntity<?> finaliserInscription(@RequestBody Map<String, Object> payload) {
        try {
            System.out.println("Tentative d'inscription pour : " + payload.get("email"));

            String email = (String) payload.get("email");
            String motDePasse = (String) payload.get("motDePasse");
            String nom = (String) payload.get("nom");
            String prenom = (String) payload.get("prenom");
            String telephone = (String) payload.get("telephone");
            String token = (String) payload.get("token");

            Utilisateur nouvelUtilisateur = new Utilisateur();
            nouvelUtilisateur.setEmail(email);
            nouvelUtilisateur.setMotDePasse(motDePasse);
            nouvelUtilisateur.setNom(nom);
            nouvelUtilisateur.setPrenom(prenom);
            nouvelUtilisateur.setTelephone(telephone);
            nouvelUtilisateur.setTokenActivation(token);
            nouvelUtilisateur.setRole(Role.UTILISATEUR);


            inscriptions.inscrire(nouvelUtilisateur);
            serviceAudit.logInscription(email, "SUCCESS", "Inscription finalisée avec succès");

            return ResponseEntity.ok(Map.of("message", "Inscription finalisée avec succès !"));
        } catch (Exception e) {
            e.printStackTrace();
            serviceAudit.logInscription((String) payload.get("email"), "FAILED", e.getMessage());
            return ResponseEntity.status(400).body(Map.of("erreur", e.getMessage()));
        }
    }

}
