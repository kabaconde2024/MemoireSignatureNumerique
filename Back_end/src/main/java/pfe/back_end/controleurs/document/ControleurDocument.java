package pfe.back_end.controleurs.document;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.services.document.ServiceGestionDocuments;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://memoire-frontend.onrender.com"
}, allowCredentials = "true")
public class ControleurDocument {

    @Autowired
    private ServiceGestionDocuments serviceDocument;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired 
    private InvitationRepository invitationRepository;

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            System.out.println("=== UPLOAD DOCUMENT ===");
            System.out.println("Utilisateur: " + (authentication != null ? authentication.getName() : "null"));
            System.out.println("Fichier: " + file.getOriginalFilename());
            
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("erreur", "Utilisateur non authentifié"));
            }
            
            Document doc = serviceDocument.enregistrerDocument(file);
            
            System.out.println("✅ Document uploadé avec ID: " + doc.getId());
            
            return ResponseEntity.ok(Map.of(
                "id", doc.getId(),
                "nomFichier", doc.getNomFichier(),
                "message", "Document uploadé avec succès"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }
    
    @GetMapping("/liste-signes-auto")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listerDocumentsAutoSignes(Authentication auth) {
        try {
            Utilisateur user = utilisateurRepository.findByEmailIgnoreCase(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            List<Document> docs = documentRepository.findByProprietaireIdAndSignataireIdAndEstSigneTrue(user.getId(), user.getId());

            List<Map<String, Object>> response = docs.stream().map(doc -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", doc.getId());
                map.put("nomFichier", doc.getNomFichier());
                map.put("dateCreation", doc.getDateCreation());
                map.put("type", "Auto-signature HSM/Local");
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur : " + e.getMessage());
        }
    }

    @GetMapping("/download/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> telechargerDocument(@PathVariable Long id, Authentication auth) {
        try {
            Document doc = documentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document introuvable"));

            String emailConnecte = auth.getName();
            boolean estProprietaire = doc.getProprietaire() != null && doc.getProprietaire().getEmail().equalsIgnoreCase(emailConnecte);
            boolean estSignataire = doc.getSignataire() != null && doc.getSignataire().getEmail().equalsIgnoreCase(emailConnecte);

            if (!estProprietaire && !estSignataire) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            byte[] contenu = doc.getContenu();
            if (contenu == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getNomFichier() + "\"")
                    .body(contenu);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/supprimer/{id}")
    @Transactional
    public ResponseEntity<?> supprimer(@PathVariable Long id, Authentication auth) {
        try {
            Document doc = documentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document introuvable"));

            if (doc.getProprietaire() == null || !doc.getProprietaire().getEmail().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Action non autorisée");
            }

            serviceDocument.supprimerDocument(id);
            return ResponseEntity.ok(Map.of("message", "Document supprimé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/mes-documents-signes")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMesDocumentsSignes(Authentication auth) {
        try {
            Utilisateur me = utilisateurRepository.findByEmailIgnoreCase(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            List<Document> docs = documentRepository.findByProprietaireIdAndEstSigneTrue(me.getId());

            List<Map<String, Object>> response = docs.stream().map(doc -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", doc.getId());
                map.put("nomDocument", doc.getNomFichier());

                if (doc.getSignataire() != null) {
                    map.put("signataire", doc.getSignataire().getPrenom() + " " + doc.getSignataire().getNom());
                    map.put("email", doc.getSignataire().getEmail());
                } else {
                    invitationRepository.findByDocument(doc).stream()
                            .filter(inv -> "SIGNE".equals(inv.getStatut()))
                            .findFirst()
                            .ifPresentOrElse(
                                    inv -> {
                                        map.put("signataire", inv.getPrenomSignataire() + " " + inv.getNomSignataire());
                                        map.put("email", inv.getEmailDestinataire());
                                    },
                                    () -> {
                                        map.put("signataire", "Auto-signé");
                                        map.put("email", me.getEmail());
                                    }
                            );
                }

                map.put("dateSignature", doc.getDateCreation());
                map.put("statut", "SIGNE");
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

    /**
     * ✅ Liste des invitations envoyées - CORRIGÉ AVEC typeSignature
     */
    @GetMapping("/mes-invitations")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMesInvitations(Authentication auth) {
        try {
            Utilisateur me = utilisateurRepository.findByEmailIgnoreCase(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            List<InvitationSignature> list = invitationRepository.findByExpediteurOrderByDateInvitationDesc(me);

            List<Map<String, Object>> response = list.stream().map(inv -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", inv.getId());
                map.put("nomFichier", inv.getDocument() != null ? inv.getDocument().getNomFichier() : "Document sans nom");
                map.put("prenomSignataire", inv.getPrenomSignataire());
                map.put("nomSignataire", inv.getNomSignataire());
                map.put("emailDestinataire", inv.getEmailDestinataire());
                map.put("telephoneSignataire", inv.getTelephoneSignataire());
                map.put("dateInvitation", inv.getDateInvitation());
                map.put("dateSignature", inv.getDateSignature());
                map.put("statut", inv.getStatut());
                
                // ✅ AJOUT CRUCIAL - Le type de signature
                map.put("typeSignature", inv.getTypeSignature());
                map.put("type_signature", inv.getTypeSignature()); // Pour compatibilité
                
                // ✅ Coordonnées
                map.put("coordonneeX", inv.getCoordonneeX());
                map.put("coordonneeY", inv.getCoordonneeY());
                map.put("pageNumber", inv.getPageNumber());
                
                // ✅ Document associé
                if (inv.getDocument() != null) {
                    map.put("documentId", inv.getDocument().getId());
                    map.put("documentNom", inv.getDocument().getNomFichier());
                }
                
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur : " + e.getMessage());
        }
    }

    @GetMapping("/download-signe/{documentId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> telechargerDocumentSigne(@PathVariable Long documentId) {
        try {
            Document doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé"));

            byte[] contenu = doc.getContenu();
            if (contenu == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getNomFichier() + "\"")
                    .body(contenu);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur interne : " + e.getMessage());
        }
    }
}