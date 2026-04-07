package pfe.back_end.repositories.sql;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.Document; // Assure-toi que l'import est correct
import pfe.back_end.modeles.entites.Utilisateur;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<InvitationSignature, Long> {


    Optional<InvitationSignature> findByTokenSignature(String token);


    Optional<InvitationSignature> findByDocumentId(Long documentId);

 //   Optional<InvitationSignature> findByDocumentAndEmailDestinataire(Document document, String emailDestinataire);
    List<InvitationSignature> findByDocument(Document document);

    List<InvitationSignature> findTop10ByOrderByDateInvitationDesc();

    List<InvitationSignature> findByExpediteurOrderByDateInvitationDesc(Utilisateur expediteur);
   // Optional<InvitationSignature> findByTokenSignatureAndEmailDestinataire(String token, String email);
}