package pfe.back_end.services.document;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.StatutDocument;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.repositories.sql.UtilisateurRepository;

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

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Transactional
    public Document enregistrerDocument(MultipartFile fichier) throws Exception {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Utilisateur proprietaire = utilisateurRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        byte[] octets = fichier.getBytes();
        String hashHex = calculerHash(octets);

        Document doc = new Document();
        doc.setNomFichier(fichier.getOriginalFilename());
        doc.setHashSha256(hashHex);
        doc.setTaille(fichier.getSize());
        doc.setTypeMime(fichier.getContentType());
        doc.setStatut(StatutDocument.EN_ATTENTE);
        doc.setDateCreation(LocalDateTime.now());
        doc.setEstSigne(false);
        doc.setProprietaire(proprietaire);
        doc.setContenu(octets); 
        doc.setCheminStockage("db://" + System.currentTimeMillis() + "_" + fichier.getOriginalFilename());

        return documentRepository.save(doc); 
    }

    /**
     * ✅ FINALISATION CORRIGÉE - Stocke le hash au lieu du PDF complet
     */
    @Transactional
    public Document finaliserSignatureGenerique(Long idDocument, byte[] contenuSigne, Utilisateur signataire, String token) {
        Document doc = documentRepository.findById(idDocument)
                .orElseThrow(() -> new RuntimeException("Document introuvable ID : " + idDocument));

        System.out.println("=== FINALISATION SIGNATURE ===");
        System.out.println("Document ID: " + idDocument);
        
        // 1. Mise à jour du contenu et métadonnées
        doc.setContenu(contenuSigne);
        doc.setTaille((long) contenuSigne.length);
        
        String nomSigne = "SIGNE_" + doc.getNomFichier().replace("SIGNE_", "");
        doc.setNomFichier(nomSigne);
        doc.setCheminStockage("db://" + System.currentTimeMillis() + "_" + nomSigne);
        doc.setEstSigne(true);
        doc.setStatut(StatutDocument.SIGNE);
        doc.setDateHorodatage(LocalDateTime.now());

        if (signataire != null) {
            doc.setSignataire(signataire);
        }

        // 2. ✅ CORRECTION CRUCIALE : Stocker le HASH, pas le PDF complet !
        String hashSignature = calculerHash(contenuSigne);
        doc.setSignatureNumerique(hashSignature);
        System.out.println("✅ Signature hash stocké: " + hashSignature);

        // 3. Gestion des invitations
        if (token != null) {
            InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation invalide"));
            inv.setStatut("SIGNE");
            inv.setDateSignature(LocalDateTime.now());
            inv.setDocument(doc);
            invitationRepository.save(inv);
        }

        // 4. Preuve d'intégrité finale
        String hashStr = calculerHash(contenuSigne);
        doc.setHashSha256(hashStr);
        doc.setHashDocument(hashStr);
        System.out.println("✅ Hash document final: " + hashStr);

        Document saved = documentRepository.save(doc);
        System.out.println("✅ Document finalisé avec succès");
        return saved;
    }

    @Transactional(readOnly = true)
    public byte[] getContenu(Long id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document introuvable"));

        if (doc.getContenu() == null) {
            throw new RuntimeException("Le contenu binaire est vide en base de données.");
        }
        return doc.getContenu();
    }

    @Transactional
    public void supprimerDocument(Long id) {
        if (!documentRepository.existsById(id)) {
            throw new RuntimeException("Document introuvable");
        }
        documentRepository.deleteById(id);
    }

    private String calculerHash(byte[] donnees) {
        try {
            byte[] hashBytes = MessageDigest.getInstance("SHA-256").digest(donnees);
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Erreur SHA-256", e);
        }
    }

    @Transactional
    public String sauvegarderSurDisque(Long idDocument, byte[] contenu, String nomFichier) {
        Document doc = documentRepository.findById(idDocument)
                .orElseThrow(() -> new RuntimeException("Document introuvable ID: " + idDocument));

        doc.setContenu(contenu);
        doc.setTaille((long) contenu.length);
        String chemin = "db://" + System.currentTimeMillis() + "_" + nomFichier;
        doc.setCheminStockage(chemin);

        documentRepository.save(doc);
        return chemin;
    }
    
    /**
     * Méthode publique pour calculer le hash (accessible depuis les contrôleurs)
     */
    public String calculerHashPublic(byte[] donnees) {
        return calculerHash(donnees);
    }
}