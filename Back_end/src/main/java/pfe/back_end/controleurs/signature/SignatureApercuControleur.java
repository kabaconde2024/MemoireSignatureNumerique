package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.repositories.sql.InvitationRepository;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/signature")
public class SignatureApercuControleur {

    @Autowired private InvitationRepository invitationRepository;

    @GetMapping("/apercu/{token}")
    public ResponseEntity<Resource> apercu(@PathVariable String token) {
        try {
            InvitationSignature invitation = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation introuvable"));

            Path path = Paths.get(invitation.getDocument().getCheminStockage());
            Resource resource = new UrlResource(path.toUri());

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + invitation.getDocument().getNomFichier() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}