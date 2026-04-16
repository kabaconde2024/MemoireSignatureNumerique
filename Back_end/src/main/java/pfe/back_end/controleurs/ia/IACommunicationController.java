// pfe/back_end/controleurs/ia/IACommunicationController.java
package pfe.back_end.controleurs.ia;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.AuditLog;
import pfe.back_end.repositories.nosql.AuditLogRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ia")
@CrossOrigin(origins = {"https://localhost:3000", "http://localhost:8000"})
public class IACommunicationController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Value("${ia.api.key:trustsign-secret-key-2024}")
    private String iaApiKey;

    /**
     * ENDPOINT PUBLIC POUR L'IA - Sans authentification requise
     * Utilise une clé API pour la sécurité
     */
    @GetMapping("/logs/public")
    public ResponseEntity<Map<String, Object>> getLogsForIAPublic(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String userEmail,
            @RequestParam(defaultValue = "1000") int limit,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey) {

        // Vérifier la clé API
        if (apiKey == null || !apiKey.equals(iaApiKey)) {
            System.err.println("🔐 [IA] Tentative d'accès sans clé API valide");
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Unauthorized",
                    "message", "Clé API invalide ou manquante"
            ));
        }

        System.out.println("🔐 [IA] Accès public autorisé avec clé API");
        return getLogsForIA(startDate, endDate, userEmail, limit);
    }

    /**
     * Endpoint original (nécessite authentification SUPER_ADMIN)
     */
    @GetMapping("/logs")
    public ResponseEntity<Map<String, Object>> getLogsForIA(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String userEmail,
            @RequestParam(defaultValue = "1000") int limit) {

        List<AuditLog> logs;

        if (startDate != null && endDate != null) {
            LocalDateTime start = LocalDateTime.parse(startDate, FORMATTER);
            LocalDateTime end = LocalDateTime.parse(endDate, FORMATTER);
            logs = auditLogRepository.findByTimestampBetween(start, end);
        } else if (userEmail != null && !userEmail.isEmpty()) {
            logs = auditLogRepository.findByUserEmailOrderByTimestampDesc(userEmail);
        } else {
            logs = auditLogRepository.findAll();
        }

        // Limiter le nombre de logs
        if (logs.size() > limit) {
            logs = logs.subList(0, limit);
        }

        // Transformer en format lisible par Python
        List<Map<String, Object>> formattedLogs = logs.stream()
                .map(this::formatLogForIA)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("total", formattedLogs.size());
        response.put("logs", formattedLogs);
        response.put("timestamp", LocalDateTime.now().toString());

        System.out.println("🤖 [IA] Envoi de " + formattedLogs.size() + " logs au service IA");
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint pour recevoir les anomalies détectées par FastAPI
     * (Public avec clé API)
     */
    @PostMapping("/anomalies")
    public ResponseEntity<Map<String, String>> receiveAnomalies(
            @RequestBody Map<String, Object> anomaliesData,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey) {

        // Vérifier la clé API
        if (apiKey == null || !apiKey.equals(iaApiKey)) {
            return ResponseEntity.status(401).body(Map.of("status", "unauthorized"));
        }

        System.out.println("🤖 [IA] Réception de " +
                (anomaliesData.get("anomalies") != null ? ((List<?>) anomaliesData.get("anomalies")).size() : 0) +
                " anomalies détectées");

        // TODO: Stocker les anomalies dans une collection MongoDB dédiée
        // anomalyRepository.saveAll(anomalies);

        return ResponseEntity.ok(Map.of(
                "status", "received",
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    /**
     * Endpoint pour recevoir les rapports d'audit générés
     */
    @PostMapping("/rapports")
    public ResponseEntity<Map<String, String>> receiveAuditReport(
            @RequestBody Map<String, Object> report,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey) {

        if (apiKey == null || !apiKey.equals(iaApiKey)) {
            return ResponseEntity.status(401).body(Map.of("status", "unauthorized"));
        }

        System.out.println("🤖 [IA] Réception du rapport d'audit: " + report.get("id_rapport"));
        return ResponseEntity.ok(Map.of("status", "received"));
    }

    /**
     * Health check pour le service IA
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "Spring Boot IA Communication",
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    /**
     * Formate un AuditLog pour l'envoi à FastAPI
     */
    private Map<String, Object> formatLogForIA(AuditLog log) {
        Map<String, Object> formatted = new HashMap<>();
        formatted.put("id", log.getId());
        formatted.put("typeEvenement", log.getEventType());
        formatted.put("horodatage", log.getTimestamp().toString());
        formatted.put("idUtilisateur", log.getUserId());
        formatted.put("emailUtilisateur", log.getUserEmail());
        formatted.put("roleUtilisateur", log.getUserRole());
        formatted.put("adresseIP", log.getIpAddress());
        formatted.put("agentUtilisateur", log.getUserAgent());
        formatted.put("idDocument", log.getDocumentId());
        formatted.put("nomDocument", log.getDocumentName());
        formatted.put("typeSignature", log.getSignatureType());
        formatted.put("statut", log.getStatus());
        formatted.put("details", log.getDetails());
        formatted.put("jeton", log.getToken());
        return formatted;
    }
}