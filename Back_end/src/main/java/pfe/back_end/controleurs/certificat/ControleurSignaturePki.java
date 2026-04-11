package pfe.back_end.controleurs.certificat;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.modeles.entites.StatutDocument;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.DocumentRepository;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.audit.ServiceAudit;
import pfe.back_end.services.ca.ServiceVerificationCertificat;
import pfe.back_end.services.document.ServiceGestionDocuments;
import pfe.back_end.services.signature.ServiceSignaturePki;
import pfe.back_end.services.signature.ServiceVerificationSignature;

import java.io.ByteArrayInputStream;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://memoire-frontend.onrender.com"
}, allowCredentials = "true")
public class ControleurSignaturePki {

    @Autowired
    private ServiceSignaturePki serviceSignaturePki;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private ServiceVerificationCertificat serviceVerificationCertificat;

    @Autowired
    private ServiceVerificationSignature serviceVerificationSignature;

    @Autowired
    private ServiceGestionDocuments serviceDocument;

    @Autowired
    private ServiceAudit serviceAudit;

    @Autowired
    private HttpServletRequest httpServletRequest;

    @PostMapping("/pki/executer")
    @Transactional
    public ResponseEntity<?> signerDocumentPki(@RequestBody Map<String, Object> payload) {
        try {
            String emailConnecte = SecurityContextHolder.getContext().getAuthentication().getName();
            String token = (String) payload.get("token");

            Utilisateur actuel = utilisateurRepository.findByEmail(emailConnecte)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            if (!"ACTIVE".equals(actuel.getStatusPki())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "erreur", "Votre certificat n'est pas actif. Statut actuel: " + actuel.getStatusPki()
                ));
            }

            InvitationSignature invitation = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation non trouvée"));

            if ("SIGNE".equals(invitation.getStatut())) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Ce document a déjà été signé"));
            }

            // Récupération du document et du contenu original
            Document doc = invitation.getDocument(); 
            byte[] pdfOriginal = serviceDocument.getContenu(doc.getId());
            
            String nom = actuel.getPrenom() + " " + actuel.getNom();
            String tel = actuel.getTelephone();
            String otp = (String) payload.get("otp");

            float x = Float.parseFloat(payload.get("x").toString());
            float y = Float.parseFloat(payload.get("y").toString());
            int page = Integer.parseInt(payload.get("pageNumber").toString());
            float displayWidth = Float.parseFloat(payload.get("displayWidth").toString());
            float displayHeight = Float.parseFloat(payload.get("displayHeight").toString());

            String aliasHSM = actuel.getEmail();

            // Exécution de la signature technique
            byte[] pdfSigne = serviceSignaturePki.signerDocumentPki(
                    pdfOriginal, nom, tel, otp, x, y, page,
                    displayWidth, displayHeight, aliasHSM, doc.getId()
            );

            // ✅ 1. Mettre à jour l'INVITATION
            invitation.setStatut("SIGNE");
            invitation.setDateSignature(LocalDateTime.now());
            invitation.setCoordonneeX(x);
            invitation.setCoordonneeY(y);
            invitation.setPageNumber(page);
            invitationRepository.save(invitation);

            // ✅ 2. Sauvegarder le contenu binaire en BDD via le service
            String nouveauNom = "SIGNE_PKI_" + doc.getNomFichier();
            // CORRECTION : Appel de la méthode avec 'doc' déjà initialisé
            String cheminStockage = serviceDocument.sauvegarderSurDisque(doc.getId(), pdfSigne, nouveauNom);

            // ✅ 3. Mettre à jour les métadonnées du DOCUMENT
            doc.setCheminStockage(cheminStockage);
            doc.setNomFichier(nouveauNom);
            doc.setEstSigne(true);
            doc.setStatut(StatutDocument.SIGNE);
            doc.setDateHorodatage(LocalDateTime.now());
            doc.setSignataire(actuel);

            // ✅ 4. Stocker la signature numérique en base64 pour les preuves
            String signatureBase64 = Base64.getEncoder().encodeToString(pdfSigne);
            doc.setSignatureNumerique(signatureBase64);

            documentRepository.save(doc);

            // Audit
            serviceAudit.logSignatureDocument(
                    actuel.getId(), actuel.getEmail(),
                    doc.getId(), doc.getNomFichier(),
                    "PKI", "SUCCESS", "Signature PKI avec certificat", httpServletRequest
            );

            // Retourner le PDF signé
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", nouveauNom);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfSigne);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("erreur", e.getMessage()));
        }
    }

    @GetMapping("/verifier-certificat-expediteur/{token}")
    public ResponseEntity<?> verifierCertificatExpediteur(@PathVariable String token) {
        try {
            InvitationSignature invitation = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation non trouvée"));

            Utilisateur expediteur = invitation.getExpediteur();

            if (expediteur.getCertificatPem() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "valide", false,
                        "message", "L'expéditeur n'a pas de certificat numérique associé à son compte."
                ));
            }

            X509Certificate certificat = chargerCertificatDepuisPem(expediteur.getCertificatPem());
            ServiceVerificationCertificat.VerificationResult result =
                    serviceVerificationCertificat.verifierCertificat(expediteur, certificat);

            Map<String, Object> response = new HashMap<>();
            response.put("valide", result.isValid());
            response.put("message", result.getResume());
            response.put("infos", result.getInfos());
            response.put("warnings", result.getWarnings());
            response.put("erreurs", result.getErreurs());
            response.put("sujet", certificat.getSubjectX500Principal().getName());
            response.put("emetteur", certificat.getIssuerX500Principal().getName());
            response.put("dateExpiration", certificat.getNotAfter());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

    private X509Certificate chargerCertificatDepuisPem(String pem) throws Exception {
        String pemClean = pem
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll("\\s", "");
        byte[] certBytes = java.util.Base64.getDecoder().decode(pemClean);
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));
    }

    @PostMapping("/verifier-document-signe")
    public ResponseEntity<?> verifierDocumentSigne(@RequestBody Map<String, String> payload) {
        try {
            String documentId = payload.get("documentId");
            Optional<Document> docOpt = documentRepository.findById(Long.parseLong(documentId));

            if (docOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("erreur", "Document non trouvé"));
            }

            Document doc = docOpt.get();
            Optional<InvitationSignature> invOpt = invitationRepository.findByDocumentId(doc.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("documentId", documentId);
            response.put("nomFichier", doc.getNomFichier());

            if (invOpt.isPresent() && "SIGNE".equals(invOpt.get().getStatut())) {
                response.put("documentIntegre", true);
                response.put("message", "Document signé électroniquement");

                List<Map<String, Object>> signatures = new ArrayList<>();
                Map<String, Object> sigInfo = new HashMap<>();
                sigInfo.put("nomSignataire", invOpt.get().getNomSignataire() + " " + invOpt.get().getPrenomSignataire());
                sigInfo.put("dateSignature", invOpt.get().getDateSignature());
                sigInfo.put("certificatValide", true);
                signatures.add(sigInfo);

                response.put("signatures", signatures);
                response.put("nbSignatures", 1);
            } else {
                response.put("documentIntegre", false);
                response.put("message", "Document non signé ou signature non reconnue");
                response.put("signatures", new ArrayList<>());
                response.put("nbSignatures", 0);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }
}