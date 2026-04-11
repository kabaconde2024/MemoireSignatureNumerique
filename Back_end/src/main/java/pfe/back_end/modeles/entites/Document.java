package pfe.back_end.modeles.entites;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
    @JsonIgnore // 👈 CRUCIAL : Empêche le crash lors de la conversion JSON
    @Column(name = "contenu", columnDefinition = "BYTEA")
    private byte[] contenu;

    @Column(name = "signature_numerique", columnDefinition = "TEXT")
    private String signatureNumerique;

    @Column(name = "jeton_timestamp", columnDefinition = "TEXT")
    private String jetonTimestamp;

    private LocalDateTime dateHorodatage;

    @Enumerated(EnumType.STRING)
    private StatutDocument statut;

    private LocalDateTime dateCreation;

    @Column(name = "hash_document", length = 128)
    private String hashDocument; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proprietaire_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "motDePasse", "codeMfa", "organisation"})
    private Utilisateur proprietaire;

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