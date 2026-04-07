package pfe.back_end.modeles.entites;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// ✅ ON SUPPRIME l'import javax.swing et on n'importe RIEN pour Document
// car il est déjà dans le même dossier (package) que cette classe.
import java.time.LocalDateTime;

@Entity
@Table(name = "invitations_signature")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "document_id", nullable = false)
    private Document document; // ✅ Maintenant, c'est bien TON entité Document

    @ManyToOne
    @JoinColumn(name = "expediteur_id", nullable = false)
    private Utilisateur expediteur;

    @Column(nullable = false)
    private String emailDestinataire;

    private String telephoneSignataire;

    private String nomSignataire;
    private String prenomSignataire;

    @Column(unique = true, nullable = false)
    private String tokenSignature;

    @Column(name = "type_signature")
    private String typeSignature;

    private String statut;
    private LocalDateTime dateInvitation;
    private LocalDateTime dateSignature;
    private float coordonneeX;
    private float coordonneeY;
    private int pageNumber;

    @PrePersist
    protected void onCreate() {
        if (this.dateInvitation == null) {
            this.dateInvitation = LocalDateTime.now();
        }
        if (this.statut == null) {
            this.statut = "EN_ATTENTE";
        }
    }

    @Column(name = "date_expiration")
    private LocalDateTime dateExpiration;

    @Column(name = "hash_document_signe", length = 64)
    private String hashDocumentSigne;

    public String getHashDocumentSigne() { return hashDocumentSigne; }
    public void setHashDocumentSigne(String hashDocumentSigne) { this.hashDocumentSigne = hashDocumentSigne; }
}