package pfe.back_end.modeles.entites;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "archives_documents")
@Data
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
}