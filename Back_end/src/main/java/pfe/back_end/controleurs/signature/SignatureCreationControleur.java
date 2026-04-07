package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.dto.SignatureRequest;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.audit.ServiceAudit;
import pfe.back_end.services.notification.ServiceNotification;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = "*")
public class SignatureCreationControleur {

    @Autowired private DocumentRepository documentRepository;
    @Autowired private UtilisateurRepository utilisateurRepository;
    @Autowired private InvitationRepository invitationRepository;
    @Autowired private ServiceNotification serviceNotification;
    @Autowired
    private ServiceAudit serviceAudit;

    @PostMapping("/creer-transaction")
    @Transactional
    public ResponseEntity<?> configurer(@RequestBody SignatureRequest request, Authentication auth) {
        try {
            Document doc = documentRepository.findById(request.getDocumentId())
                    .orElseThrow(() -> new RuntimeException("Document introuvable"));

            Utilisateur expediteur = utilisateurRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Expéditeur non trouvé"));

            InvitationSignature invitation = InvitationSignature.builder()
                    .document(doc)
                    .expediteur(expediteur)
                    .emailDestinataire(request.getEmailDestinataire())
                    .telephoneSignataire(request.getTelephone())
                    .nomSignataire(request.getNom())
                    .prenomSignataire(request.getPrenom())
                    .tokenSignature(UUID.randomUUID().toString())
                    .statut("EN_ATTENTE")
                    .dateInvitation(LocalDateTime.now())
                    .coordonneeX(request.getX())
                    .coordonneeY(request.getY())
                    .pageNumber(request.getPageNumber())
                    .typeSignature(request.getTypeSignature())
                    .dateInvitation(LocalDateTime.now())
                    .dateExpiration(LocalDateTime.now().plusDays(7))
                    // ✅ AJOUT : type de signature
                    .build();

            invitationRepository.save(invitation);

            // ✅ AJOUT : passer le type de signature dans l'emai
            serviceNotification.envoyerLienSignature(
                    invitation.getEmailDestinataire(),
                    expediteur.getPrenom() + " " + expediteur.getNom(),
                    doc.getNomFichier(),
                    invitation.getTokenSignature(),
                    request.getTypeSignature()  // ✅ AJOUT : type de signature
            );

            serviceAudit.logEnvoiInvitation(
                    expediteur.getId(), expediteur.getEmail(),
                    doc.getId(), doc.getNomFichier(),
                    request.getEmailDestinataire(),
                    invitation.getTokenSignature()
            );
            return ResponseEntity.ok(Map.of("token", invitation.getTokenSignature()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }
}