package pfe.back_end.modeles.entites;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import java.sql.Types;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
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

    // ==================== GETTERS ET SETTERS ====================
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getNomFichier() { return nomFichier; }
    public void setNomFichier(String nomFichier) { this.nomFichier = nomFichier; }
    
    public String getTypeMime() { return typeMime; }
    public void setTypeMime(String typeMime) { this.typeMime = typeMime; }
    
    public long getTaille() { return taille; }
    public void setTaille(long taille) { this.taille = taille; }
    
    public boolean isEstSigne() { return estSigne; }
    public void setEstSigne(boolean estSigne) { this.estSigne = estSigne; }
    
    public String getCheminStockage() { return cheminStockage; }
    public void setCheminStockage(String cheminStockage) { this.cheminStockage = cheminStockage; }
    
    public String getHashSha256() { return hashSha256; }
    public void setHashSha256(String hashSha256) { this.hashSha256 = hashSha256; }
    
    public byte[] getContenu() { return contenu; }
    public void setContenu(byte[] contenu) { this.contenu = contenu; }
    
    public String getSignatureNumerique() { return signatureNumerique; }
    public void setSignatureNumerique(String signatureNumerique) { this.signatureNumerique = signatureNumerique; }
    
    public String getJetonTimestamp() { return jetonTimestamp; }
    public void setJetonTimestamp(String jetonTimestamp) { this.jetonTimestamp = jetonTimestamp; }
    
    public LocalDateTime getDateHorodatage() { return dateHorodatage; }
    public void setDateHorodatage(LocalDateTime dateHorodatage) { this.dateHorodatage = dateHorodatage; }
    
    public StatutDocument getStatut() { return statut; }
    public void setStatut(StatutDocument statut) { this.statut = statut; }
    
    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
    
    public String getHashDocument() { return hashDocument; }
    public void setHashDocument(String hashDocument) { this.hashDocument = hashDocument; }
    
    public Utilisateur getProprietaire() { return proprietaire; }
    public void setProprietaire(Utilisateur proprietaire) { this.proprietaire = proprietaire; }
    
    public Utilisateur getSignataire() { return signataire; }
    public void setSignataire(Utilisateur signataire) { this.signataire = signataire; }
}