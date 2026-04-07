package pfe.back_end.controleurs.certificat;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.audit.ServiceAudit;

import java.io.ByteArrayInputStream;
import java.security.cert.CertificateExpiredException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/utilisateur/pki")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://memoire-frontend.onrender.com"  // ← AJOUTEZ CETTE LIGNE
}, allowCredentials = "true")


public class PkiUtilisateurControleur {

    @Autowired
    private UtilisateurRepository utilisateurRepository;


    @Autowired
    private ServiceAudit serviceAudit;


    @PostMapping("/request-certificate")
    public ResponseEntity<?> requestCertificate(Authentication auth) {
        try {
            String email = auth.getName();
            System.out.println("📜 Demande de certificat pour: " + email);

            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            if ("PENDING".equals(user.getStatusPki())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Une demande de certificat est déjà en attente de validation par l'administrateur."
                ));
            }

            if ("ACTIVE".equals(user.getStatusPki())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Vous avez déjà un certificat actif."
                ));
            }

            user.setStatusPki("PENDING");
            utilisateurRepository.save(user);

            serviceAudit.logDemandeCertificat(user.getId(), email, "PENDING", "Demande de certificat envoyée");

            System.out.println("✅ Demande de certificat enregistrée pour: " + email);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Votre demande de certificat a été envoyée à l'administrateur."
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Erreur lors de la demande: " + e.getMessage()
            ));
        }
    }



    @GetMapping("/mon-statut")
    public ResponseEntity<?> getMonStatut(Authentication auth) {
        try {
            String email = auth.getName();
            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            String status = user.getStatusPki();
            if (status == null || status.isEmpty()) {
                status = "NONE";
            }

            Map<String, Object> response = new HashMap<>();
            response.put("status", status);
            response.put("certificatPem", user.getCertificatPem());
            response.put("hsmAlias", user.getHsmAlias());

            // ✅ Ajouter les dates depuis le certificat
            if (user.getCertificatPem() != null && !user.getCertificatPem().isEmpty()) {
                try {
                    CertificateFactory cf = CertificateFactory.getInstance("X.509");
                    String pemClean = user.getCertificatPem()
                            .replace("-----BEGIN CERTIFICATE-----", "")
                            .replace("-----END CERTIFICATE-----", "")
                            .replaceAll("\\s", "");
                    byte[] certBytes = java.util.Base64.getDecoder().decode(pemClean);
                    X509Certificate cert = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));

                    response.put("dateEmission", cert.getNotBefore());
                    response.put("dateExpiration", cert.getNotAfter());
                    response.put("sujet", cert.getSubjectX500Principal().getName());
                    response.put("emetteur", cert.getIssuerX500Principal().getName());
                    response.put("numeroSerie", cert.getSerialNumber().toString(16).toUpperCase());

                } catch (Exception e) {
                    System.err.println("Erreur lecture certificat: " + e.getMessage());
                }
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

    @PostMapping("/renouveler-certificat")
    public ResponseEntity<?> renouvelerCertificat(Authentication auth) {
        try {
            String email = auth.getName();
            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // Vérifier si le certificat existe et est expiré
            if (user.getCertificatPem() != null && "ACTIVE".equals(user.getStatusPki())) {
                try {
                    CertificateFactory cf = CertificateFactory.getInstance("X.509");
                    String pemClean = user.getCertificatPem()
                            .replace("-----BEGIN CERTIFICATE-----", "")
                            .replace("-----END CERTIFICATE-----", "")
                            .replaceAll("\\s", "");
                    byte[] certBytes = java.util.Base64.getDecoder().decode(pemClean);
                    X509Certificate cert = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));
                    cert.checkValidity();
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "Votre certificat est encore valide. Il expire le " + cert.getNotAfter()
                    ));
                } catch (CertificateExpiredException e) {
                    // Certificat expiré - on passe à PENDING directement
                    System.out.println("📜 Certificat expiré pour " + email + " - Renouvellement demandé");
                    user.setStatusPki("PENDING");
                    user.setCertificatPem(null);
                    utilisateurRepository.save(user);

                    serviceAudit.logRenouvellementCertificat(user.getId(), email, "PENDING", "Demande de renouvellement de certificat");
                    return ResponseEntity.ok(Map.of(
                            "status", "success",
                            "message", "Votre demande de renouvellement a été envoyée à l'administrateur."
                    ));
                }
            }

            // Si pas de certificat ou autre, passer à PENDING
            user.setStatusPki("PENDING");
            utilisateurRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Votre demande de certificat a été envoyée."
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }
}