package pfe.back_end.controleurs.authentification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.*;
import pfe.back_end.repositories.nosql.AuditLogRepository;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.configuration.ServiceConfiguration;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://trustsign-frontend.onrender.com"  // ← AJOUTEZ CETTE LIGNE
}, allowCredentials = "true")
public class SuperAdminController {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private ServiceConfiguration serviceConfiguration;

    // ==================== STATISTIQUES ====================

    @GetMapping("/stats/utilisateurs")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Long>> getStatsUtilisateurs() {
        List<Utilisateur> allUsers = utilisateurRepository.findAll();

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", (long) allUsers.size());
        stats.put("actifs", allUsers.stream().filter(u -> "ACTIF".equals(u.getStatutCycleVie())).count());
        stats.put("inactifs", allUsers.stream().filter(u -> "INACTIF".equals(u.getStatutCycleVie())).count());
        stats.put("superAdmins", allUsers.stream().filter(u -> u.getRole() == Role.SUPER_ADMIN).count());
        stats.put("adminsEntreprise", allUsers.stream().filter(u -> u.getRole() == Role.ADMIN_ENTREPRISE).count());
        stats.put("employes", allUsers.stream().filter(u -> u.getRole() == Role.EMPLOYE).count());
        stats.put("utilisateurs", allUsers.stream().filter(u -> u.getRole() == Role.UTILISATEUR).count());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/documents")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Long>> getStatsDocuments() {
        List<Document> allDocs = documentRepository.findAll();

        long signes = allDocs.stream()
                .filter(d -> d.isEstSigne() ||
                        (d.getStatut() != null && "SIGNE".equals(d.getStatut().toString())))
                .count();

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", (long) allDocs.size());
        stats.put("signes", signes);
        stats.put("nonSignes", (long) allDocs.size() - signes);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/activites")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getDernieresActivites() {
        List<InvitationSignature> dernieresInvitations = invitationRepository.findTop10ByOrderByDateInvitationDesc();

        List<Map<String, Object>> activites = dernieresInvitations.stream().map(inv -> {
            Map<String, Object> act = new HashMap<>();
            act.put("action", inv.getStatut() != null && inv.getStatut().equals("SIGNE") ? "Signature effectuée" : "Invitation à signer");
            act.put("user", inv.getExpediteur() != null ? inv.getExpediteur().getEmail() : "Inconnu");
            act.put("signataire", inv.getEmailDestinataire());
            act.put("date", inv.getDateInvitation());
            act.put("dateSignature", inv.getDateSignature());
            act.put("status", inv.getStatut() != null && inv.getStatut().equals("SIGNE") ? "Succès" : "En attente");
            act.put("typeSignature", inv.getTypeSignature() != null ? inv.getTypeSignature() : "simple");
            act.put("document", inv.getDocument() != null ? inv.getDocument().getNomFichier() : "Inconnu");
            return act;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(activites);
    }

    // ==================== STATISTIQUES PAR TYPE DE SIGNATURE ====================

    @GetMapping("/stats/signatures")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Long>> getStatsSignatures() {
        List<InvitationSignature> allInvitations = invitationRepository.findAll();
        List<Document> allDocs = documentRepository.findAll();

        long simpleInvitations = allInvitations.stream()
                .filter(i -> "SIGNE".equals(i.getStatut()) && "simple".equals(i.getTypeSignature()))
                .count();

        long pkiInvitations = allInvitations.stream()
                .filter(i -> "SIGNE".equals(i.getStatut()) && "pki".equals(i.getTypeSignature()))
                .count();

        long autoSignatures = allDocs.stream()
                .filter(d -> d.isEstSigne() &&
                        d.getProprietaire() != null &&
                        d.getSignataire() != null &&
                        d.getProprietaire().getId().equals(d.getSignataire().getId()))
                .count();

        Map<String, Long> stats = new HashMap<>();
        stats.put("simple", simpleInvitations);
        stats.put("pki", pkiInvitations);
        stats.put("auto", autoSignatures);
        stats.put("total", simpleInvitations + pkiInvitations + autoSignatures);

        return ResponseEntity.ok(stats);
    }

    // ==================== STATISTIQUES PKI ====================

    @GetMapping("/pki/stats")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Long>> getPkiStats() {
        List<Utilisateur> allUsers = utilisateurRepository.findAll();

        Map<String, Long> stats = new HashMap<>();
        stats.put("pending", allUsers.stream().filter(u -> "PENDING".equals(u.getStatusPki())).count());
        stats.put("active", allUsers.stream().filter(u -> "ACTIVE".equals(u.getStatusPki())).count());
        stats.put("expired", allUsers.stream().filter(u -> "EXPIRED".equals(u.getStatusPki())).count());
        stats.put("none", allUsers.stream().filter(u -> u.getStatusPki() == null || "NONE".equals(u.getStatusPki())).count());

        return ResponseEntity.ok(stats);
    }

    // ==================== GESTION DES UTILISATEURS ====================

    @GetMapping("/utilisateurs")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllUtilisateurs() {
        List<Utilisateur> users = utilisateurRepository.findAll();

        List<Map<String, Object>> response = users.stream().map(user -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", user.getId());
            map.put("email", user.getEmail());
            map.put("nom", user.getNom());
            map.put("prenom", user.getPrenom());
            map.put("telephone", user.getTelephone());
            map.put("role", user.getRole() != null ? user.getRole().name() : "UTILISATEUR");
            map.put("statut", user.getStatutCycleVie() != null ? user.getStatutCycleVie() : "ACTIF");
            map.put("status_pki", user.getStatusPki() != null ? user.getStatusPki() : "NONE");
            map.put("hsmAlias", user.getHsmAlias());
            map.put("imageSignature", user.getImageSignature() != null);
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/utilisateurs/{userId}/role")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long userId, @RequestBody Map<String, String> payload) {
        try {
            Utilisateur user = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            String newRole = payload.get("role");
            user.setRole(Role.valueOf(newRole));
            utilisateurRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Rôle mis à jour avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

    @PutMapping("/utilisateurs/{userId}/status")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long userId, @RequestBody Map<String, String> payload) {
        try {
            Utilisateur user = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            String newStatus = payload.get("statut");
            user.setStatutCycleVie(newStatus);
            utilisateurRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Statut mis à jour avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

   
    @GetMapping("/config")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getConfiguration() {
        Map<String, Object> config = new HashMap<>();

        config.put("pkiCertificatDureeMinutes",
                Integer.parseInt(serviceConfiguration.getValeur("pki.certificat.duree.minutes")));
        config.put("signatureExpirationJours",
                Integer.parseInt(serviceConfiguration.getValeur("signature.expiration.jours")));
        config.put("emailNotifications",
                Boolean.parseBoolean(serviceConfiguration.getValeur("notifications.email.enabled")));
        config.put("smsEnabled",
                Boolean.parseBoolean(serviceConfiguration.getValeur("notifications.sms.enabled")));
        config.put("mfaObligatoire",
                Boolean.parseBoolean(serviceConfiguration.getValeur("securite.mfa.obligatoire")));
        config.put("otpExpirationMinutes",
                Integer.parseInt(serviceConfiguration.getValeur("signature.otp.expiration.minutes")));
        config.put("otpLongueur",
                Integer.parseInt(serviceConfiguration.getValeur("signature.otp.longueur")));

        // ✅ NOUVEAU : Ajouter la configuration MFA
        config.put("mfaCodeExpirationMinutes",
                Integer.parseInt(serviceConfiguration.getValeur("mfa.code.expiration.minutes")));

        config.put("version", "1.0.0");
        config.put("hsmStatus", "connecté");
        config.put("dateServeur", LocalDateTime.now().toString());

        return ResponseEntity.ok(config);
    }

    @PostMapping("/config")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<?> saveConfiguration(@RequestBody Map<String, Object> config) {
        try {
            if (config.containsKey("pkiCertificatDureeMinutes")) {
                serviceConfiguration.setValeur("pki.certificat.duree.minutes",
                        String.valueOf(config.get("pkiCertificatDureeMinutes")));
            }
            if (config.containsKey("signatureExpirationJours")) {
                serviceConfiguration.setValeur("signature.expiration.jours",
                        String.valueOf(config.get("signatureExpirationJours")));
            }
            if (config.containsKey("emailNotifications")) {
                serviceConfiguration.setValeur("notifications.email.enabled",
                        String.valueOf(config.get("emailNotifications")));
            }
            if (config.containsKey("smsEnabled")) {
                serviceConfiguration.setValeur("notifications.sms.enabled",
                        String.valueOf(config.get("smsEnabled")));
            }
            if (config.containsKey("mfaObligatoire")) {
                serviceConfiguration.setValeur("securite.mfa.obligatoire",
                        String.valueOf(config.get("mfaObligatoire")));
            }
            if (config.containsKey("otpExpirationMinutes")) {
                serviceConfiguration.setValeur("signature.otp.expiration.minutes",
                        String.valueOf(config.get("otpExpirationMinutes")));
            }
            if (config.containsKey("otpLongueur")) {
                serviceConfiguration.setValeur("signature.otp.longueur",
                        String.valueOf(config.get("otpLongueur")));
            }

            // ✅ NOUVEAU : Sauvegarder la durée MFA
            if (config.containsKey("mfaCodeExpirationMinutes")) {
                serviceConfiguration.setValeur("mfa.code.expiration.minutes",
                        String.valueOf(config.get("mfaCodeExpirationMinutes")));
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Configuration sauvegardée avec succès",
                    "savedConfig", config
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }


    // ==================== UTILITAIRES ====================

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "SuperAdmin API");
        health.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(health);
    }


    @Autowired
    private AuditLogRepository auditLogRepository;

    @GetMapping("/audit/logs")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        List<AuditLog> logs;

        if (userEmail != null && !userEmail.isEmpty()) {
            logs = auditLogRepository.findByUserEmailOrderByTimestampDesc(userEmail);
        } else if (eventType != null && !eventType.isEmpty()) {
            logs = auditLogRepository.findByEventTypeOrderByTimestampDesc(eventType);
        } else {
            logs = auditLogRepository.findAll();
        }

        // Trier par date décroissante
        logs.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));

        return ResponseEntity.ok(logs);
    }

    @GetMapping("/audit/stats")
    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    public ResponseEntity<?> getAuditStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24h = now.minusHours(24);
        LocalDateTime last7d = now.minusDays(7);

        Map<String, Object> stats = new HashMap<>();
        stats.put("signatures_24h", auditLogRepository.countByEventTypeAndTimestampBetween(
                "SIGNATURE_DOCUMENT", last24h, now));
        stats.put("signatures_7d", auditLogRepository.countByEventTypeAndTimestampBetween(
                "SIGNATURE_DOCUMENT", last7d, now));
        stats.put("invitations_24h", auditLogRepository.countByEventTypeAndTimestampBetween(
                "ENVOI_INVITATION", last24h, now));
        stats.put("certificats_generes", auditLogRepository.countByEventTypeAndTimestampBetween(
                "GENERATION_CERTIFICAT", last7d, now));

        return ResponseEntity.ok(stats);
    }
}