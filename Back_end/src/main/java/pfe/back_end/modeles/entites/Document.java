package pfe.back_end.modeles.entites;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomFichier;
    private String typeMime;
    private long taille;
    private boolean estSigne = false;

    @Column(unique = true)
    private String cheminStockage;

    @Column(nullable = false)
    private String hashSha256;


    @Lob
    @Column(name = "contenu", columnDefinition = "BYTEA") // BYTEA est spécifique à PostgreSQL pour les fichiers binaires
    private byte[] contenu;

    @Column(name = "signature_numerique", columnDefinition = "TEXT")
    private String signatureNumerique;

    @Column(name = "jeton_timestamp", columnDefinition = "TEXT")
    private String jetonTimestamp;

    private LocalDateTime dateHorodatage;

    @Enumerated(EnumType.STRING)
    private StatutDocument statut;

    private LocalDateTime dateCreation;

    // Dans Document.java - AJOUTER CE CHAMP
    @Column(name = "hash_document", length = 128)
    private String hashDocument;  // SHA-256 du document signé

    public String getJetonTimestamp() { return jetonTimestamp; }
    public void setJetonTimestamp(String jetonTimestamp) { this.jetonTimestamp = jetonTimestamp; }

    public LocalDateTime getDateHorodatage() { return dateHorodatage; }
    public void setDateHorodatage(LocalDateTime dateHorodatage) { this.dateHorodatage = dateHorodatage; }

    // Celui qui a créé/uploadé le document
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proprietaire_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "motDePasse", "codeMfa", "organisation"})
    private Utilisateur proprietaire;

    // L'utilisateur interne qui doit signer ou a signé le document
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signataire_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "motDePasse", "codeMfa", "organisation"})
    private Utilisateur signataire;

    @PrePersist
    protected void onCreate() {
        this.dateCreation = LocalDateTime.now();
        if (this.statut == null) {
            this.statut = StatutDocument.EN_ATTENTE;
        }
    }
}