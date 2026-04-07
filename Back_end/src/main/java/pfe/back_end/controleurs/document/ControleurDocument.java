package pfe.back_end.controleurs.document;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
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
import pfe.back_end.modeles.entites.Role;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.document.ServiceGestionDocuments;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "https://localhost:3000", allowCredentials = "true")
public class ControleurDocument {

    @Autowired
    private ServiceGestionDocuments serviceDocument;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired private pfe.back_end.repositories.sql.InvitationRepository invitationRepository;
    /**
     * ✅ Upload d'un document initial
     */
    @PostMapping("/upload")
    @Transactional
    public ResponseEntity<?> uploader(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            Utilisateur proprietaire = utilisateurRepository.findByEmailIgnoreCase(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            Document doc = serviceDocument.enregistrerDocument(file);
            doc.setProprietaire(proprietaire);

            documentRepository.save(doc);

            return ResponseEntity.ok(Map.of(
                    "message", "Document importé avec succès",
                    "id", doc.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("erreur", "Erreur lors de l'upload : " + e.getMessage()));
        }
    }

    /**
     * ✅ Liste tous les documents selon le rôle (Admin, Employé, etc.)
     */

    /**
     * ✅ Liste uniquement les documents signés (pour le composant ListeDocumentsAutoSignes)
     */

    @GetMapping("/liste-signes-auto") // Nouveau endpoint spécifique
    @Transactional(readOnly = true)
    public ResponseEntity<?> listerDocumentsAutoSignes(Authentication auth) {
        try {
            Utilisateur user = utilisateurRepository.findByEmailIgnoreCase(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // On cherche les documents où l'utilisateur est PROPRIÉTAIRE ET SIGNATAIRE
            // Et où le flag estSigne est à true
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

/*
    @GetMapping("/liste-signes")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Document>> listerDocumentsSignes(Authentication auth) {
        try {
            Utilisateur user = utilisateurRepository.findByEmailIgnoreCase(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // Nécessite la méthode dans ton repository
            List<Document> docs = documentRepository.findByProprietaireIdAndEstSigneTrue(user.getId());

            docs.forEach(d -> {
                d.setProprietaire(null);
                d.setSignataire(null);
            });

            return ResponseEntity.ok(docs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
*/
    /**
     * ✅ Téléchargement SÉCURISÉ (Vérifie si l'utilisateur est concerné par le doc)
     */
    @GetMapping("/download/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> telechargerDocument(@PathVariable Long id, Authentication auth) {
        try {
            Document doc = documentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document introuvable"));

            String emailConnecte = auth.getName();

            // Logique de sécurité : Seul le proprio ou le signataire peut télécharger
            boolean estProprietaire = doc.getProprietaire() != null &&
                    doc.getProprietaire().getEmail().equalsIgnoreCase(emailConnecte);
            boolean estSignataire = doc.getSignataire() != null &&
                    doc.getSignataire().getEmail().equalsIgnoreCase(emailConnecte);

            if (!estProprietaire && !estSignataire) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Path chemin = Paths.get(doc.getCheminStockage());
            Resource ressource = new UrlResource(chemin.toUri());

            if (!ressource.exists() || !ressource.isReadable()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getNomFichier() + "\"")
                    .body(ressource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * ✅ Suppression sécurisée
     */
    @DeleteMapping("/supprimer/{id}")
    @Transactional
    public ResponseEntity<?> supprimer(@PathVariable Long id, Authentication auth) {
        try {
            Document doc = documentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document introuvable"));

            // Vérification : Seul le propriétaire peut supprimer le document
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

            // On récupère les documents dont l'utilisateur est propriétaire et qui sont signés
            List<Document> docs = documentRepository.findByProprietaireIdAndEstSigneTrue(me.getId());

            List<Map<String, Object>> response = docs.stream().map(doc -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", doc.getId());
                map.put("nomDocument", doc.getNomFichier());

                // LOGIQUE DE RÉCUPÉRATION DU SIGNATAIRE
                if (doc.getSignataire() != null) {
                    // Cas : Signature interne (un utilisateur de la plateforme)
                    map.put("signataire", doc.getSignataire().getPrenom() + " " + doc.getSignataire().getNom());
                    map.put("email", doc.getSignataire().getEmail());
                } else {
                    // Cas : Signature externe (on cherche l'invitation liée à ce document)
                    // On récupère la dernière invitation signée pour ce document
                    invitationRepository.findByDocument(doc).stream()
                            .filter(inv -> "SIGNE".equals(inv.getStatut()))
                            .findFirst()
                            .ifPresentOrElse(
                                    inv -> {
                                        map.put("signataire", inv.getPrenomSignataire() + " " + inv.getNomSignataire());
                                        map.put("email", inv.getEmailDestinataire());
                                    },
                                    () -> {
                                        map.put("signataire", "Inconnu");
                                        map.put("email", "N/A");
                                    }
                            );
                }

                map.put("dateSignature", doc.getDateCreation()); // Ou doc.getDateHorodatage() si tu l'utilises
                map.put("statut", "SIGNE");
                return map;
            }).toList();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }
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

                // AJOUT CRUCIAL : l'ID du document pour le téléchargement
                if (inv.getDocument() != null) {
                    map.put("documentId", inv.getDocument().getId());
                    map.put("nomFichier", inv.getDocument().getNomFichier());
                } else {
                    map.put("nomFichier", "Document sans nom");
                }

                map.put("prenomSignataire", inv.getPrenomSignataire());
                map.put("nomSignataire", inv.getNomSignataire());
                map.put("emailDestinataire", inv.getEmailDestinataire());
                map.put("dateInvitation", inv.getDateInvitation());
                map.put("dateSignature", inv.getDateSignature());

                // ✅ AJOUTER LE TYPE DE SIGNATURE
                map.put("typeSignature", inv.getTypeSignature() != null ? inv.getTypeSignature() : "simple");

                map.put("statut", inv.getStatut());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur : " + e.getMessage());
        }
    }

    @GetMapping("/download-signe/{documentId}")
    public ResponseEntity<?> telechargerDocumentSigne(@PathVariable Long documentId, Authentication auth) {
        try {
            Document doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document ID " + documentId + " non trouvé en BDD"));

            Path chemin = Paths.get(doc.getCheminStockage());
            Resource ressource = new UrlResource(chemin.toUri());

            if (!ressource.exists()) {
                System.err.println("Fichier physiquement absent : " + doc.getCheminStockage());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Fichier introuvable sur le disque");
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getNomFichier() + "\"")
                    .body(ressource);

        } catch (Exception e) {
            e.printStackTrace(); // Pour voir l'erreur exacte dans la console IntelliJ
            return ResponseEntity.status(500).body("Erreur interne : " + e.getMessage());
        }
    }
}