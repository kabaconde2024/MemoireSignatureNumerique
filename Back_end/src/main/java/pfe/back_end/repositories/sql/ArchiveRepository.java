package pfe.back_end.repositories.sql;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pfe.back_end.modeles.entites.ArchiveDocument;
import pfe.back_end.modeles.entites.StatutArchive;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArchiveRepository extends JpaRepository<ArchiveDocument, Long> {

    Optional<ArchiveDocument> findByDocumentId(Long documentId);

    Optional<ArchiveDocument> findByArchiveReference(String archiveReference);

    List<ArchiveDocument> findByStatut(StatutArchive statut);

    List<ArchiveDocument> findByDateExpirationBefore(LocalDateTime date);

    @Query("SELECT a FROM ArchiveDocument a WHERE a.dateExpiration < :date AND a.statut = 'ACTIF'")
    List<ArchiveDocument> findArchivesExpirees(@Param("date") LocalDateTime date);

    @Query("SELECT COUNT(a) FROM ArchiveDocument a WHERE a.dateArchivage BETWEEN :debut AND :fin")
    long countArchivesByPeriod(@Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);
}