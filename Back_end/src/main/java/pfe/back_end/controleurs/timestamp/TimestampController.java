package pfe.back_end.controleurs.timestamp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.services.timestamp.ServiceHorodatage;

import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/horodatage")
@CrossOrigin(origins = "https://localhost:3000", allowCredentials = "true")
public class TimestampController {

    @Autowired
    private ServiceHorodatage serviceHorodatage;

    /**
     * Vérifier le statut du service d'horodatage
     */
    @GetMapping("/statut")
    public ResponseEntity<Map<String, Object>> getStatut() {
        Map<String, Object> statut = new HashMap<>();
        statut.put("enabled", serviceHorodatage.isEnabled());
        statut.put("tsaUrl", serviceHorodatage.getTsaUrl());
        statut.put("certificatsCharges", serviceHorodatage.areCertificatesLoaded());
        statut.put("connecte", serviceHorodatage.testConnexion());
        return ResponseEntity.ok(statut);
    }

    /**
     * Tester l'horodatage avec des données arbitraires
     */
    @PostMapping("/tester")
    public ResponseEntity<Map<String, Object>> testerHorodatage(@RequestBody(required = false) Map<String, String> body) {
        Map<String, Object> result = new HashMap<>();

        try {
            String testData = body != null && body.containsKey("data") ? body.get("data") : "Test horodatage " + System.currentTimeMillis();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(testData.getBytes());

            byte[] token = serviceHorodatage.getTimestamp(hash);

            if (token != null) {
                String tokenBase64 = serviceHorodatage.jetonEnBase64(token);
                boolean valide = serviceHorodatage.validerToken(token, hash);

                result.put("success", true);
                result.put("valide", valide);
                result.put("tokenBase64", tokenBase64.substring(0, Math.min(100, tokenBase64.length())) + "...");
                result.put("hashOriginal", Base64.getEncoder().encodeToString(hash));
                result.put("message", valide ? "✅ Horodatage valide" : "⚠️ Token invalide");
            } else {
                result.put("success", false);
                result.put("message", "❌ Échec de l'horodatage");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Horodater un hash existant
     */
    @PostMapping("/horodater-hash")
    public ResponseEntity<Map<String, Object>> horodaterHash(@RequestBody Map<String, String> request) {
        Map<String, Object> result = new HashMap<>();

        try {
            String hashBase64 = request.get("hash");
            byte[] hash = Base64.getDecoder().decode(hashBase64);

            byte[] token = serviceHorodatage.getTimestamp(hash);

            if (token != null) {
                String tokenBase64 = serviceHorodatage.jetonEnBase64(token);
                boolean valide = serviceHorodatage.validerToken(token, hash);

                result.put("success", true);
                result.put("valide", valide);
                result.put("tokenBase64", tokenBase64);
                result.put("message", "Horodatage réussi");
            } else {
                result.put("success", false);
                result.put("message", "Échec de l'horodatage");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Vérifier un token d'horodatage
     */
    @PostMapping("/verifier-token")
    public ResponseEntity<Map<String, Object>> verifierToken(@RequestBody Map<String, String> request) {
        Map<String, Object> result = new HashMap<>();

        try {
            String tokenBase64 = request.get("token");
            String hashOriginalBase64 = request.get("hashOriginal");

            byte[] token = serviceHorodatage.jetonDepuisBase64(tokenBase64);
            byte[] hashOriginal = Base64.getDecoder().decode(hashOriginalBase64);

            boolean valide = serviceHorodatage.validerToken(token, hashOriginal);

            result.put("valide", valide);
            result.put("message", valide ? "✅ Token valide" : "❌ Token invalide");

            // Ajouter les informations du token si valide
            if (valide) {
                Map<String, Object> infos = serviceHorodatage.getInfosToken(tokenBase64);
                result.put("infos", infos);
            }
        } catch (Exception e) {
            result.put("valide", false);
            result.put("error", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Vérifier l'horodatage d'un document par son ID
     */
    @GetMapping("/verifier/{documentId}")
    public ResponseEntity<Map<String, Object>> verifierHorodatageDocument(@PathVariable Long documentId) {
        Map<String, Object> result = new HashMap<>();

        try {
            // Cette méthode nécessite d'avoir accès au repository des documents
            // Vous pouvez l'implémenter si besoin
            result.put("documentId", documentId);
            result.put("message", "Fonctionnalité à implémenter - Vérification du document");
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Récupérer les informations d'un token (sans validation)
     */
    @PostMapping("/infos-token")
    public ResponseEntity<Map<String, Object>> getInfosToken(@RequestBody Map<String, String> request) {
        Map<String, Object> result = new HashMap<>();

        try {
            String tokenBase64 = request.get("token");
            Map<String, Object> infos = serviceHorodatage.getInfosToken(tokenBase64);
            result.put("success", true);
            result.put("infos", infos);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }
}