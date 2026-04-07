package pfe.back_end.services.document;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.StatutDocument;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
public class ServiceGestionDocuments {

    private final String REPERTOIRE_STOCKAGE = "storage/documents/";

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired private pfe.back_end.repositories.sql.InvitationRepository invitationRepository;

    public Document enregistrerDocument(MultipartFile fichier) throws Exception {
        Path cheminRepertoire = Paths.get(REPERTOIRE_STOCKAGE);
        if (!Files.exists(cheminRepertoire)) {
            Files.createDirectories(cheminRepertoire);
        }

        String nomFichierUnique = System.currentTimeMillis() + "_" + fichier.getOriginalFilename();
        Path cheminCible = cheminRepertoire.resolve(nomFichierUnique);

        Files.write(cheminCible, fichier.getBytes());

        // Utilisation de HexFormat (plus moderne) pour le hash
        String hashHex = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(fichier.getBytes()));

        // Utilisation du builder si disponible, sinon setter
        Document doc = new Document();
        doc.setNomFichier(fichier.getOriginalFilename());
        doc.setCheminStockage(cheminCible.toString());
        doc.setHashSha256(hashHex);
        doc.setTaille(fichier.getSize());
        doc.setTypeMime(fichier.getContentType());
        doc.setStatut(StatutDocument.EN_ATTENTE);
        doc.setDateCreation(LocalDateTime.now());
        doc.setEstSigne(false);

        return doc; // Le contrôleur fera le repository.save()
    }

    public Document finaliserDocumentSigne(Long idDocument, byte[] contenuSigne, Utilisateur signataire) {
        // 1. On récupère le document original
        Document doc = documentRepository.findById(idDocument)
                .orElseThrow(() -> new RuntimeException("Document original introuvable"));

        // 2. On supprime l'ancien fichier non signé du disque
        try {
            Files.deleteIfExists(Paths.get(doc.getCheminStockage()));
        } catch (IOException e) {
            System.err.println("Erreur suppression ancien fichier : " + e.getMessage());
        }

        // 3. On enregistre le nouveau fichier (le PDF signé)
        String nomSigne = "SIGNE_" + doc.getNomFichier().replace("SIGNE_", "");
        String nouveauChemin = sauvegarderSurDisque(contenuSigne, nomSigne);

        // 4. MISE À JOUR DE L'ENTITÉ
        doc.setCheminStockage(nouveauChemin);
        doc.setNomFichier(nomSigne);
        doc.setEstSigne(true);
        doc.setStatut(StatutDocument.SIGNE);

        // --- LA LIGNE MANQUANTE ICI ---
        doc.setSignataire(signataire);
        // ------------------------------

        doc.setTaille((long) contenuSigne.length);
        doc.setDateCreation(LocalDateTime.now()); // Date de signature finale

        // Mise à jour du Hash pour l'intégrité
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(contenuSigne);
            doc.setHashSha256(HexFormat.of().formatHex(hash));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Erreur SHA-256", e);
        }

        return documentRepository.save(doc);
    }

    public String sauvegarderSurDisque(byte[] contenu, String nomOriginal) {
        try {
            Path cheminRepertoire = Paths.get(REPERTOIRE_STOCKAGE);
            if (!Files.exists(cheminRepertoire)) Files.createDirectories(cheminRepertoire);

            // Nettoyer le nom pour éviter SIGNE_SIGNE_AUTOSIGNE_...
            String nomNettoye = nomOriginal.replace("SIGNE_", "").replace("AUTOSIGNE_", "");
            String nomUnique = System.currentTimeMillis() + "_AUTOSIGNE_" + nomNettoye;

            Path cheminCible = cheminRepertoire.resolve(nomUnique);
            Files.write(cheminCible, contenu);
            return cheminCible.toString();
        } catch (IOException e) {
            throw new RuntimeException("Erreur écriture disque", e);
        }
    }

    public void supprimerDocument(Long id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document introuvable"));
        try {
            Files.deleteIfExists(Paths.get(doc.getCheminStockage()));
        } catch (IOException e) {
            System.err.println("Erreur suppression physique : " + e.getMessage());
        }
        documentRepository.delete(doc);
    }

    // Dans ServiceGestionDocuments.java
    public byte[] getContenu(Long id) throws Exception {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document introuvable en BDD avec l'ID : " + id));

        java.io.File file = new java.io.File(doc.getCheminStockage());
        if (!file.exists()) {
            throw new RuntimeException("Fichier physique introuvable sur le disque : " + doc.getCheminStockage());
        }

        return java.nio.file.Files.readAllBytes(file.toPath());
    }

    @Transactional
    public Document finaliserSignatureGenerique(Long idDocument, byte[] contenuSigne, Utilisateur signataire, String token) {

        // 1. Récupérer le document
        Document doc = documentRepository.findById(idDocument)
                .orElseThrow(() -> new RuntimeException("Document original introuvable"));

        // 2. Mise à jour du fichier physique (remplacement de l'original par le signé)
        try {
            if (doc.getCheminStockage() != null) {
                Files.deleteIfExists(Paths.get(doc.getCheminStockage()));
            }
        } catch (IOException e) {
            System.err.println("Erreur suppression ancien fichier : " + e.getMessage());
        }

        String nomSigne = "SIGNE_" + doc.getNomFichier().replace("SIGNE_", "");
        String nouveauChemin = sauvegarderSurDisque(contenuSigne, nomSigne);

        // 3. Mise à jour des métadonnées du Document
        doc.setCheminStockage(nouveauChemin);
        doc.setNomFichier(nomSigne);
        doc.setEstSigne(true);
        doc.setStatut(StatutDocument.SIGNE);
        doc.setDateHorodatage(LocalDateTime.now());

        if (signataire != null) {
            doc.setSignataire(signataire);
        }

        // ✅ 4. STOCKER LA SIGNATURE NUMÉRIQUE EN BASE64
        String signatureBase64 = java.util.Base64.getEncoder().encodeToString(contenuSigne);
        doc.setSignatureNumerique(signatureBase64);

        System.out.println("✅ Signature numérique stockée - Longueur: " + signatureBase64.length() + " caractères");

        // Cas B : Signature via un lien email (Invitation)
        if (token != null) {
            InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation invalide ou expirée"));

            inv.setStatut("SIGNE");
            inv.setDateSignature(LocalDateTime.now());
            invitationRepository.save(inv);
        }

        // 5. Recalcul du Hash SHA-256 (Preuve d'intégrité du document signé)
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(contenuSigne);
            doc.setHashSha256(HexFormat.of().formatHex(hash));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Erreur lors du calcul du Hash SHA-256", e);
        }

        // 6. Sauvegarde finale du document
        return documentRepository.save(doc);
    }
}