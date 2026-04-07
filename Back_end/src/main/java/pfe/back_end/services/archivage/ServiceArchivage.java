package pfe.back_end.services.archivage;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.PdfOutputIntent;
import com.itextpdf.kernel.pdf.PdfAConformanceLevel;
import com.itextpdf.pdfa.PdfADocument;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.tsp.TimeStampToken;
import org.bouncycastle.tsp.TimeStampTokenInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pfe.back_end.modeles.entites.ArchiveDocument;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.NiveauArchive;
import pfe.back_end.modeles.entites.StatutArchive;
import pfe.back_end.repositories.sql.ArchiveRepository;
import pfe.back_end.repositories.sql.DocumentRepository;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ServiceArchivage {

    @Autowired
    private ArchiveRepository archiveRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Value("${archivage.dossier.base:/data/archives}")
    private String dossierArchives;

    @Value("${archivage.duree.conservation.ans:10}")
    private int dureeConservationAns;

    private static final String HASH_ALGO = "SHA-256";

    /**
     * Archive un document signé
     */
    public ArchiveDocument archiverDocument(Long documentId, NiveauArchive niveau) throws Exception {
        // 1. Récupérer le document
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document non trouvé: " + documentId));

        // 2. Vérifier si déjà archivé
        if (archiveRepository.findByDocumentId(documentId).isPresent()) {
            throw new RuntimeException("Document déjà archivé");
        }

        // 3. Lire le contenu du document
        byte[] contenu = lireFichierDocument(document);

        // 4. Convertir en format d'archivage
        byte[] pdfArchive = convertirEnFormatArchive(contenu);

        // 5. Calculer le hash
        String hash = calculerHash(pdfArchive);

        // 6. Sauvegarder physiquement le fichier
        String chemin = sauvegarderFichierArchive(pdfArchive, document);

        // 7. Créer l'entité d'archive
        ArchiveDocument archive = ArchiveDocument.builder()
                .document(document)
                .archiveReference(genererReferenceArchive(document))
                .cheminStockage(chemin)
                .hashArchive(hash)
                .niveau(niveau)
                .statut(StatutArchive.ACTIF)
                .dateArchivage(LocalDateTime.now())
                .dateExpiration(LocalDateTime.now().plusYears(dureeConservationAns))
                .tailleArchive(formatTaille(pdfArchive.length))
                .formatArchive("PDF/A-3")
                .certificatArchive(genererCertificatArchive(document))
                .preuveConservation(genererPreuveConservation(pdfArchive, hash))
                .build();

        return archiveRepository.save(archive);
    }

    /**
     * Récupère une archive
     */
    public byte[] recupererArchive(Long documentId) throws Exception {
        ArchiveDocument archive = archiveRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new RuntimeException("Archive non trouvée"));

        if (archive.getStatut() == StatutArchive.SUPPRIME) {
            throw new RuntimeException("Archive supprimée");
        }

        Path path = Paths.get(archive.getCheminStockage());
        return Files.readAllBytes(path);
    }

    /**
     * Supprime une archive (après expiration légale)
     */
    public void supprimerArchive(Long archiveId) throws Exception {
        ArchiveDocument archive = archiveRepository.findById(archiveId)
                .orElseThrow(() -> new RuntimeException("Archive non trouvée"));

        if (archive.getDateExpiration().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("L'archive n'est pas encore expirée");
        }

        // Supprimer le fichier physique
        Path path = Paths.get(archive.getCheminStockage());
        Files.deleteIfExists(path);

        // Mettre à jour le statut
        archive.setStatut(StatutArchive.SUPPRIME);
        archive.setDateSuppression(LocalDateTime.now());
        archiveRepository.save(archive);
    }

    /**
     * Purge les archives expirées
     */
    public int purgerArchivesExpirees() {
        List<ArchiveDocument> archivesExpirees = archiveRepository.findArchivesExpirees(LocalDateTime.now());
        int compteur = 0;

        for (ArchiveDocument archive : archivesExpirees) {
            try {
                supprimerArchive(archive.getId());
                compteur++;
                System.out.println("✅ Archive purgée: " + archive.getArchiveReference());
            } catch (Exception e) {
                System.err.println("❌ Erreur purge archive " + archive.getId() + ": " + e.getMessage());
            }
        }

        return compteur;
    }

    /**
     * Exporte l'archive complète (document + preuves)
     */
    public byte[] exporterArchiveComplete(Long documentId) throws Exception {
        ArchiveDocument archive = archiveRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new RuntimeException("Archive non trouvée"));

        byte[] contenu = recupererArchive(documentId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {

            // Ajouter le document
            zos.putNextEntry(new ZipEntry("document.pdf"));
            zos.write(contenu);
            zos.closeEntry();

            // Ajouter les métadonnées
            zos.putNextEntry(new ZipEntry("metadonnees.json"));
            String json = String.format("""
                {
                    "reference": "%s",
                    "dateArchivage": "%s",
                    "dateExpiration": "%s",
                    "hash": "%s",
                    "taille": "%s",
                    "niveau": "%s"
                }
                """,
                    archive.getArchiveReference(),
                    archive.getDateArchivage(),
                    archive.getDateExpiration(),
                    archive.getHashArchive(),
                    archive.getTailleArchive(),
                    archive.getNiveau()
            );
            zos.write(json.getBytes());
            zos.closeEntry();

            // Ajouter la preuve de conservation
            zos.putNextEntry(new ZipEntry("preuve_conservation.txt"));
            zos.write(archive.getPreuveConservation().getBytes());
            zos.closeEntry();
        }

        return baos.toByteArray();
    }

    /**
     * Vérifie l'intégrité d'une archive
     */
    public Map<String, Object> verifierIntegriteArchive(Long documentId) throws Exception {
        ArchiveDocument archive = archiveRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new RuntimeException("Archive non trouvée"));

        Map<String, Object> resultat = new HashMap<>();
        resultat.put("reference", archive.getArchiveReference());
        resultat.put("statut", archive.getStatut().toString());
        resultat.put("dateArchivage", archive.getDateArchivage());
        resultat.put("dateExpiration", archive.getDateExpiration());

        // Vérifier l'intégrité du fichier
        byte[] contenu = recupererArchive(documentId);
        String hashActuel = calculerHash(contenu);

        boolean integre = hashActuel.equals(archive.getHashArchive());
        resultat.put("integre", integre);
        resultat.put("message", integre ? "✅ Archive intègre" : "❌ Archive corrompue");

        // Vérifier si l'archive est expirée
        boolean expiree = archive.getDateExpiration().isBefore(LocalDateTime.now());
        resultat.put("expiree", expiree);

        return resultat;
    }

    /**
     * Liste toutes les archives avec leurs métadonnées
     */
    public List<Map<String, Object>> listerToutesLesArchives() {
        List<ArchiveDocument> archives = archiveRepository.findAll();

        return archives.stream().map(archive -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", archive.getId());
            item.put("reference", archive.getArchiveReference());
            item.put("documentId", archive.getDocument().getId());
            item.put("documentNom", archive.getDocument().getNomFichier());
            item.put("dateArchivage", archive.getDateArchivage());
            item.put("dateExpiration", archive.getDateExpiration());
            item.put("hashArchive", archive.getHashArchive());
            item.put("tailleArchive", archive.getTailleArchive());
            item.put("niveau", archive.getNiveau().toString());
            item.put("statut", archive.getStatut().toString());
            item.put("certificatArchive", archive.getCertificatArchive());
            return item;
        }).collect(Collectors.toList());
    }

    /**
     * ✅ Liste les documents signés qui ne sont pas encore archivés
     */
    public List<Map<String, Object>> listerDocumentsNonArchives() {
        // Récupérer tous les documents signés
        List<Document> documentsSignes = documentRepository.findByEstSigneTrue();

        // Récupérer les IDs des documents déjà archivés
        List<Long> archivedDocIds = archiveRepository.findAll().stream()
                .map(archive -> archive.getDocument().getId())
                .collect(Collectors.toList());

        // Filtrer les documents non archivés
        return documentsSignes.stream()
                .filter(doc -> !archivedDocIds.contains(doc.getId()))
                .map(doc -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", doc.getId());
                    item.put("nom", doc.getNomFichier());
                    item.put("dateCreation", doc.getDateCreation());
                    item.put("estSigne", doc.isEstSigne());
                    return item;
                })
                .collect(Collectors.toList());
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private byte[] lireFichierDocument(Document document) throws Exception {
        if (document.getCheminStockage() != null) {
            Path path = Paths.get(document.getCheminStockage());
            return Files.readAllBytes(path);
        }
        throw new RuntimeException("Document physique non trouvé");
    }

    /**
     * Convertit un document en format d'archivage (version simplifiée)
     */
    private byte[] convertirEnFormatArchive(byte[] contenu) throws Exception {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(contenu);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfReader reader = new PdfReader(bais);
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(reader, writer);

            // Ajouter les métadonnées d'archivage
            pdfDoc.getDocumentInfo().setTitle("Document Archivé");
            pdfDoc.getDocumentInfo().setCreator("TrustSign Archive");
            pdfDoc.getDocumentInfo().setSubject("Document signé et archivé légalement");
            pdfDoc.getDocumentInfo().setKeywords("Archive, Signature, Legal, TrustSign");

            pdfDoc.close();

            return baos.toByteArray();
        }
    }

    private String calculerHash(byte[] donnees) throws Exception {
        MessageDigest digest = MessageDigest.getInstance(HASH_ALGO);
        byte[] hash = digest.digest(donnees);
        return Base64.getEncoder().encodeToString(hash);
    }

    private String sauvegarderFichierArchive(byte[] contenu, Document document) throws Exception {
        Path dossier = Paths.get(dossierArchives);
        if (!Files.exists(dossier)) {
            Files.createDirectories(dossier);
        }

        String nomFichier = String.format("%d_%s.pdf",
                document.getId(),
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
        );

        Path chemin = dossier.resolve(nomFichier);
        Files.write(chemin, contenu);

        return chemin.toString();
    }

    private String genererReferenceArchive(Document document) {
        return String.format("ARCH-%d-%s",
                document.getId(),
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
        );
    }

    private String formatTaille(long octets) {
        if (octets < 1024) return octets + " o";
        if (octets < 1024 * 1024) return String.format("%.2f Ko", octets / 1024.0);
        return String.format("%.2f Mo", octets / (1024.0 * 1024));
    }

    private String genererCertificatArchive(Document document) {
        return String.format("""
            CERTIFICAT D'ARCHIVAGE
            Document ID: %d
            Archivé le: %s
            Valide jusqu'au: %s
            Niveau: ARCHIVAGE LEGAL
            """,
                document.getId(),
                LocalDateTime.now(),
                LocalDateTime.now().plusYears(dureeConservationAns)
        );
    }

    private String genererPreuveConservation(byte[] contenu, String hash) {
        return String.format("""
            PREUVE DE CONSERVATION
            Hash du document: %s
            Date de l'empreinte: %s
            Algorithme: SHA-256
            Cette preuve atteste que le document n'a pas été altéré depuis son archivage.
            """,
                hash,
                LocalDateTime.now()
        );
    }
}