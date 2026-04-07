package pfe.back_end.modeles.entites;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    private String id;

    private String eventType;     // SIGNATURE_DOCUMENT, ENVOI_INVITATION, GENERATION_CERTIFICAT, etc.
    private LocalDateTime timestamp;

    // Informations utilisateur
    private Long userId;
    private String userEmail;
    private String userRole;
    private String ipAddress;
    private String userAgent;

    // Informations document
    private Long documentId;
    private String documentName;

    // Détails spécifiques
    private String signatureType; // SIMPLE, PKI, AUTO
    private String status;        // SUCCESS, FAILED, PENDING
    private String details;       // Message d'erreur ou détails supplémentaires
    private String token;         // Token d'invitation si applicable
}