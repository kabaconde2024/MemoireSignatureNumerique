package pfe.back_end.modeles.entites;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import java.sql.Types;
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

    @Column(name = "nom_fichier", nullable = false)
    private String nomFichier;

    @Column(name = "type_mime")
    private String typeMime;

    @Column(name = "taille")
    private long taille;

    @Column(name = "est_signe")
    private boolean estSigne = false;

    @Column(name = "chemin_storage", unique = true)
    private String cheminStockage;

    @Column(name = "hash_sha256", nullable = false)
    private String hashSha256;

    /**
     * Correction de l'erreur bytea :
     * @JdbcTypeCode(Types.BINARY) force Hibernate à traiter ce champ comme un flux binaire
     * pur, évitant la confusion avec les types Long/BigInt lors de l'insertion SQL.
     */
    @Lob
    @JsonIgnore 
    @JdbcTypeCode(Types.BINARY)
    @Column(name = "contenu", columnDefinition = "bytea")
    private byte[] contenu;

    @Column(name = "signature_numerique", columnDefinition = "TEXT")
    private String signatureNumerique;

    @Column(name = "jeton_timestamp", columnDefinition = "TEXT")
    private String jetonTimestamp;

    @Column(name = "date_horodatage")
    private LocalDateTime dateHorodatage;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut")
    private StatutDocument statut;

    @Column(name = "date_creation")
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