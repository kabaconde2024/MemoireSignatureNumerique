package pfe.back_end.services.audit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.modeles.entites.AuditLog;
import pfe.back_end.repositories.nosql.AuditLogRepository;

import java.time.LocalDateTime;

@Service
public class ServiceAudit {

    @Autowired
    private AuditLogRepository auditRepository;

    /**
     * Journalisation générique
     */
    public void log(String eventType, Long userId, String userEmail, String userRole,
                    Long documentId, String documentName, String signatureType,
                    String status, String details, String token, HttpServletRequest request) {

        String ipAddress = request != null ? request.getRemoteAddr() : "unknown";
        String userAgent = request != null ? request.getHeader("User-Agent") : "unknown";

        AuditLog log = AuditLog.builder()
                .eventType(eventType)
                .timestamp(LocalDateTime.now())
                .userId(userId)
                .userEmail(userEmail)
                .userRole(userRole)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .documentId(documentId)
                .documentName(documentName)
                .signatureType(signatureType)
                .status(status)
                .details(details)
                .token(token)
                .build();

        auditRepository.save(log);
        System.out.println("📝 [AUDIT] " + eventType + " - " + userEmail + " - " + status);
    }

    // Méthodes simplifiées
    public void logEnvoiInvitation(Long userId, String userEmail, Long documentId,
                                   String documentName, String emailDestinataire, String token) {
        log("ENVOI_INVITATION", userId, userEmail, null, documentId, documentName,
                null, "SUCCESS", "Invitation envoyée à " + emailDestinataire, token, null);
    }

    public void logSignatureDocument(Long userId, String userEmail, Long documentId,
                                     String documentName, String signatureType, String status,
                                     String details, HttpServletRequest request) {
        log("SIGNATURE_DOCUMENT", userId, userEmail, null, documentId, documentName,
                signatureType, status, details, null, request);
    }

    public void logGenerationCertificat(Long userId, String userEmail, String aliasHSM,
                                        String status, String details) {
        log("GENERATION_CERTIFICAT", userId, userEmail, null, null, null,
                "PKI", status, "Alias: " + aliasHSM + " - " + details, null, null);
    }

    public void logValidationOTP(String telephone, String email, boolean success, String details) {
        AuditLog log = AuditLog.builder()
                .eventType("VALIDATION_OTP")
                .timestamp(LocalDateTime.now())
                .userEmail(email)
                .details("Téléphone: " + telephone + " - " + details)
                .status(success ? "SUCCESS" : "FAILED")
                .build();
        auditRepository.save(log);
    }

    public void logAutoSignature(Long userId, String userEmail, Long documentId,
                                 String documentName, String status, String details) {
        log("AUTO_SIGNATURE", userId, userEmail, null, documentId, documentName,
                "AUTO", status, details, null, null);
    }



    // Dans ServiceAudit.java, ajoutez ces nouvelles méthodes :

    public void logInscription(String email, String status, String details) {
        AuditLog log = AuditLog.builder()
                .eventType("INSCRIPTION")
                .timestamp(LocalDateTime.now())
                .userEmail(email)
                .status(status)
                .details(details)
                .build();
        auditRepository.save(log);
        System.out.println("📝 [AUDIT] INSCRIPTION - " + email + " - " + status);
    }

    public void logConnexion(String email, boolean success, String details, HttpServletRequest request) {
        String ipAddress = request != null ? request.getRemoteAddr() : "unknown";
        AuditLog log = AuditLog.builder()
                .eventType("CONNEXION")
                .timestamp(LocalDateTime.now())
                .userEmail(email)
                .ipAddress(ipAddress)
                .status(success ? "SUCCESS" : "FAILED")
                .details(details)
                .build();
        auditRepository.save(log);
        System.out.println("📝 [AUDIT] CONNEXION - " + email + " - " + (success ? "SUCCÈS" : "ÉCHEC"));
    }

    public void logDemandeCertificat(Long userId, String userEmail, String status, String details) {
        log("DEMANDE_CERTIFICAT", userId, userEmail, null, null, null,
                "PKI", status, details, null, null);
    }

    public void logApprobationCertificat(Long userId, String userEmail, String aliasHSM, String status, String details) {
        log("APPROBATION_CERTIFICAT", userId, userEmail, null, null, null,
                "PKI", status, "Alias HSM: " + aliasHSM + " - " + details, null, null);
    }

    public void logRenouvellementCertificat(Long userId, String userEmail, String status, String details) {
        log("RENOUVELLEMENT_CERTIFICAT", userId, userEmail, null, null, null,
                "PKI", status, details, null, null);
    }

    public void logActivationCompte(String email, String token, String status, String details) {
        AuditLog log = AuditLog.builder()
                .eventType("ACTIVATION_COMPTE")
                .timestamp(LocalDateTime.now())
                .userEmail(email)
                .token(token)
                .status(status)
                .details(details)
                .build();
        auditRepository.save(log);
    }
}