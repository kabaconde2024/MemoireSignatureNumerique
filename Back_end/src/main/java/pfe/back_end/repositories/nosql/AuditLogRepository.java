package pfe.back_end.repositories.nosql;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import pfe.back_end.modeles.entites.AuditLog;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    List<AuditLog> findByUserIdOrderByTimestampDesc(Long userId);
    List<AuditLog> findByUserEmailOrderByTimestampDesc(String userEmail);
    List<AuditLog> findByEventTypeOrderByTimestampDesc(String eventType);
    List<AuditLog> findByDocumentIdOrderByTimestampDesc(Long documentId);
    List<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    long countByEventTypeAndTimestampBetween(String eventType, LocalDateTime start, LocalDateTime end);
}