package pfe.back_end.controleurs.authentification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.services.authentification.ActivationCompte;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "https://localhost:3000", allowCredentials = "true")

public class ActivationCompteControleur {

    @Autowired
    private ActivationCompte activationCompteService;

    @GetMapping("/activer-compte")
    public ResponseEntity<?> activer(@RequestParam String token) {
        try {
            activationCompteService.activerCompte(token);
            return ResponseEntity.ok(Map.of("message", "Email vérifié avec succès !"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("erreur", e.getMessage()));
        }
    }
}