package pfe.back_end.services.document;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.StatutDocument;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.InvitationRepository;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class ServiceGestionDocuments {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired 
    private InvitationRepository invitationRepository;

    /**
     * ✅ Enregistre un nouveau document (Upload initial)
     * Correction : Ajout de @Transactional et sauvegarde immédiate.
     */
    @Transactional
    public Document enregistrerDocument(MultipartFile fichier) throws Exception {
        byte[] octets = fichier.getBytes();
        
        // Calcul du Hash SHA-256 pour l'intégrité
        String hashHex = calculerHash(octets);

        Document doc = new Document();
        doc.setNomFichier(fichier.getOriginalFilename());
        doc.setHashSha256(hashHex);
        doc.setTaille(fichier.getSize());
        doc.setTypeMime(fichier.getContentType());
        doc.setStatut(StatutDocument.EN_ATTENTE);
        doc.setDateCreation(LocalDateTime.now());
        doc.setEstSigne(false);
        
        // Stockage binaire en BDD
        doc.setContenu(octets); 
        doc.setCheminStockage("db://" + System.currentTimeMillis() + "_" + fichier.getOriginalFilename());

        return documentRepository.save(doc); 
    }

    /**
     * ✅ Finalise le processus de signature (Auto-signature, PKI, ou Invitation)
     * Remplace le contenu original par le contenu signé et met à jour les preuves.
     */
    @Transactional
    public Document finaliserSignatureGenerique(Long idDocument, byte[] contenuSigne, Utilisateur signataire, String token) {
        
        // 1. Récupérer le document original
        Document doc = documentRepository.findById(idDocument)
                .orElseThrow(() -> new RuntimeException("Document introuvable avec l'ID : " + idDocument));

        // 2. Mise à jour du contenu binaire (écrase l'original par le PDF signé)
        doc.setContenu(contenuSigne);

        // 3. Mise à jour des métadonnées de nommage
        String nomSigne = "SIGNE_" + doc.getNomFichier().replace("SIGNE_", "");
        doc.setNomFichier(nomSigne);
        doc.setCheminStockage("db://" + nomSigne);
        
        doc.setEstSigne(true);
        doc.setStatut(StatutDocument.SIGNE);
        doc.setDateHorodatage(LocalDateTime.now());
        doc.setTaille((long) contenuSigne.length);

        if (signataire != null) {
            doc.setSignataire(signataire);
        }

        // 4. Stocker la signature en Base64 pour audit
        doc.setSignatureNumerique(Base64.getEncoder().encodeToString(contenuSigne));

        // 5. Gestion des invitations (si signature via lien email)
        if (token != null) {
            InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation invalide ou expirée"));

            inv.setStatut("SIGNE");
            inv.setDateSignature(LocalDateTime.now());
            invitationRepository.save(inv);
        }

        // 6. Recalcul du Hash du document signé (Preuve d'intégrité finale)
        String hashStr = calculerHash(contenuSigne);
        doc.setHashSha256(hashStr);
        doc.setHashDocument(hashStr); 

        System.out.println("✅ Document signé et enregistré en BDD : " + doc.getNomFichier());
        return documentRepository.save(doc);
    }

    /**
     * ✅ Récupère le contenu binaire pour le téléchargement
     */
    @Transactional(readOnly = true)
    public byte[] getContenu(Long id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document introuvable"));

        if (doc.getContenu() == null) {
            throw new RuntimeException("Le contenu binaire est vide en base de données.");
        }
        return doc.getContenu();
    }

    /**
     * ✅ Supprime le document de la base de données
     */
    @Transactional
    public void supprimerDocument(Long id) {
        if (!documentRepository.existsById(id)) {
            throw new RuntimeException("Document introuvable");
        }
        documentRepository.deleteById(id);
    }

    /**
     * 🔐 Utilitaire privé pour le calcul de Hash
     */
    private String calculerHash(byte[] donnees) {
        try {
            byte[] hashBytes = MessageDigest.getInstance("SHA-256").digest(donnees);
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Erreur technique : Algorithme SHA-256 introuvable", e);
        }
    }
}