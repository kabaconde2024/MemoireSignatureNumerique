package pfe.back_end.controleurs.archivage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.ArchiveDocument;
import pfe.back_end.modeles.entites.NiveauArchive;
import pfe.back_end.services.archivage.ServiceArchivage;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/archivage")
@CrossOrigin(origins = "https://localhost:3000", allowCredentials = "true")
public class ArchiveController {

    @Autowired
    private ServiceArchivage serviceArchivage;

    /**
     * Liste toutes les archives (pour SUPER_ADMIN)
     */
    @GetMapping("/liste")
    public ResponseEntity<List<Map<String, Object>>> listerArchives() {
        try {
            List<Map<String, Object>> archives = serviceArchivage.listerToutesLesArchives();
            return ResponseEntity.ok(archives);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Liste les documents signés non archivés
     */
    @GetMapping("/documents-non-archives")
    public ResponseEntity<List<Map<String, Object>>> getDocumentsNonArchives() {
        try {
            List<Map<String, Object>> documents = serviceArchivage.listerDocumentsNonArchives();
            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Archiver un document
     */
    @PostMapping("/archiver/{documentId}")
    public ResponseEntity<Map<String, Object>> archiverDocument(
            @PathVariable Long documentId,
            @RequestParam(defaultValue = "LEGAL") NiveauArchive niveau) {

        try {
            ArchiveDocument archive = serviceArchivage.archiverDocument(documentId, niveau);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("archiveId", archive.getId());
            response.put("reference", archive.getArchiveReference());
            response.put("dateExpiration", archive.getDateExpiration());
            response.put("message", "Document archivé avec succès");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Supprimer une archive (admin uniquement)
     */
    @DeleteMapping("/{archiveId}")
    public ResponseEntity<Map<String, Object>> supprimerArchive(@PathVariable Long archiveId) {
        try {
            serviceArchivage.supprimerArchive(archiveId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Archive supprimée avec succès");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Récupérer une archive
     */
    @GetMapping("/recuperer/{documentId}")
    public ResponseEntity<byte[]> recupererArchive(@PathVariable Long documentId) {
        try {
            byte[] contenu = serviceArchivage.recupererArchive(documentId);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=archive.pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(contenu);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Vérifier l'intégrité d'une archive
     */
    @GetMapping("/verifier/{documentId}")
    public ResponseEntity<Map<String, Object>> verifierIntegrite(@PathVariable Long documentId) {
        try {
            Map<String, Object> resultat = serviceArchivage.verifierIntegriteArchive(documentId);
            return ResponseEntity.ok(resultat);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Exporter l'archive complète
     */
    @GetMapping("/exporter/{documentId}")
    public ResponseEntity<byte[]> exporterArchive(@PathVariable Long documentId) {
        try {
            byte[] archiveComplete = serviceArchivage.exporterArchiveComplete(documentId);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=archive_complete.zip")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(archiveComplete);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Purger les archives expirées (admin)
     */
    @DeleteMapping("/purger")
    public ResponseEntity<Map<String, Object>> purgerArchivesExpirees() {
        int purges = serviceArchivage.purgerArchivesExpirees();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("archivesPurgees", purges);
        response.put("message", purges + " archive(s) supprimée(s)");

        return ResponseEntity.ok(response);
    }
}