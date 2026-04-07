package pfe.back_end.services.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.InvitationRepository;

import java.time.LocalDateTime;
import java.util.UUID;


/*
@Service
public class ServiceInvitationSignature {

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private ServiceNotification emailService;

    @Transactional

    public void inviterPersonneASigner(Document doc, Utilisateur expediteur, String emailInvite, String telephoneInvite, String nomInvite, String prenomInvite) {

        if (pfe.back_end.modeles.entites.StatutDocument.SIGNE.equals(doc.getStatut())) {
            throw new SecurityException("Document déjà signé.");
        }

        String token = UUID.randomUUID().toString();

        InvitationSignature invitation = InvitationSignature.builder()
                .document(doc) // ✅ Plus de cast (Document), c'est le bon type maintenant
                .expediteur(expediteur)
                .emailDestinataire(emailInvite)
                .telephoneSignataire(telephoneInvite)
                .nomSignataire(nomInvite)
                .prenomSignataire(prenomInvite)
                .tokenSignature(token)
                .statut("EN_ATTENTE")
                .dateInvitation(LocalDateTime.now())
                .build();

        invitationRepository.save(invitation);

        try {
            String nomExpediteur = expediteur.getPrenom() + " " + expediteur.getNom();
            emailService.envoyerLienSignature(emailInvite, nomExpediteur, doc.getNomFichier(), token);
        } catch (Exception e) {
            System.err.println("Erreur email : " + e.getMessage());
        }
    }
}*/