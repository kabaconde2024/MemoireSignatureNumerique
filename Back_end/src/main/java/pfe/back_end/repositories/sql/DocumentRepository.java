package pfe.back_end.repositories.sql;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pfe.back_end.modeles.entites.Document;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {


    //List<Document> findAllByOrderByDateCreationDesc();

  //  List<Document> findByProprietaireIdOrderByDateCreationDesc(Long proprietaireId);


   // List<Document> findBySignataireIdOrderByDateCreationDesc(Long signataireId);

    List<Document> findByEstSigneTrue();


    List<Document> findByProprietaireIdAndSignataireIdAndEstSigneTrue(Long proprietaireId, Long signataireId);

    List<Document> findByProprietaireIdAndEstSigneTrue(Long proprietaireId);
}