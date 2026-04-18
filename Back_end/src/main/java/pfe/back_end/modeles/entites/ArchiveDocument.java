package pfe.back_end.modeles.entites;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "archives_documents")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArchiveDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(nullable = false, unique = true)
    private String archiveReference;

    @Column(nullable = false)
    private String cheminStockage;

    private String hashArchive;

    @Enumerated(EnumType.STRING)
    private NiveauArchive niveau;

    @Enumerated(EnumType.STRING)
    private StatutArchive statut;

    private LocalDateTime dateArchivage;
    private LocalDateTime dateExpiration;
    private LocalDateTime dateSuppression;

    private String tailleArchive;
    private String formatArchive;

    @Column(columnDefinition = "TEXT")
    private String certificatArchive;

    @Column(columnDefinition = "TEXT")
    private String preuveConservation;

    @PrePersist
    protected void onCreate() {
        dateArchivage = LocalDateTime.now();
        dateExpiration = dateArchivage.plusYears(10);
        statut = StatutArchive.ACTIF;
        archiveReference = java.util.UUID.randomUUID().toString();
    }

    // ==================== GETTERS ET SETTERS ====================
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }
    
    public String getArchiveReference() { return archiveReference; }
    public void setArchiveReference(String archiveReference) { this.archiveReference = archiveReference; }
    
    public String getCheminStockage() { return cheminStockage; }
    public void setCheminStockage(String cheminStockage) { this.cheminStockage = cheminStockage; }
    
    public String getHashArchive() { return hashArchive; }
    public void setHashArchive(String hashArchive) { this.hashArchive = hashArchive; }
    
    public NiveauArchive getNiveau() { return niveau; }
    public void setNiveau(NiveauArchive niveau) { this.niveau = niveau; }
    
    public StatutArchive getStatut() { return statut; }
    public void setStatut(StatutArchive statut) { this.statut = statut; }
    
    public LocalDateTime getDateArchivage() { return dateArchivage; }
    public void setDateArchivage(LocalDateTime dateArchivage) { this.dateArchivage = dateArchivage; }
    
    public LocalDateTime getDateExpiration() { return dateExpiration; }
    public void setDateExpiration(LocalDateTime dateExpiration) { this.dateExpiration = dateExpiration; }
    
    public LocalDateTime getDateSuppression() { return dateSuppression; }
    public void setDateSuppression(LocalDateTime dateSuppression) { this.dateSuppression = dateSuppression; }
    
    public String getTailleArchive() { return tailleArchive; }
    public void setTailleArchive(String tailleArchive) { this.tailleArchive = tailleArchive; }
    
    public String getFormatArchive() { return formatArchive; }
    public void setFormatArchive(String formatArchive) { this.formatArchive = formatArchive; }
    
    public String getCertificatArchive() { return certificatArchive; }
    public void setCertificatArchive(String certificatArchive) { this.certificatArchive = certificatArchive; }
    
    public String getPreuveConservation() { return preuveConservation; }
    public void setPreuveConservation(String preuveConservation) { this.preuveConservation = preuveConservation; }
}