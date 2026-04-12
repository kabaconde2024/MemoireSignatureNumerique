package pfe.back_end.controleurs.certificat;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import pfe.back_end.services.hsm.ServiceGestionClesHSM;
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
    
    @Autowired
    private ServiceGestionClesHSM serviceHSM;

    @PostMapping("/pki/executer")
    @Transactional
    public ResponseEntity<?> signerDocumentPki(@RequestBody Map<String, Object> payload) {
        try {
            System.out.println("========================================");
            System.out.println("=== DÉBUT SIGNATURE PKI ===");
            System.out.println("Payload reçu: " + payload.keySet());
            
            // Validation des champs obligatoires
            if (!payload.containsKey("token") || payload.get("token") == null) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Token manquant"));
            }
            if (!payload.containsKey("otp") || payload.get("otp") == null) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Code OTP manquant"));
            }
            if (!payload.containsKey("x") || !payload.containsKey("y") || !payload.containsKey("pageNumber")) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Coordonnées de signature manquantes"));
            }
            
            // Récupérer l'email de l'utilisateur connecté
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                System.err.println("❌ Utilisateur non authentifié");
                return ResponseEntity.status(401).body(Map.of("erreur", "Utilisateur non authentifié"));
            }
            
            String emailConnecte = auth.getName();
            System.out.println("📧 Email connecté: " + emailConnecte);
            
            String token = (String) payload.get("token");
            System.out.println("🔑 Token invitation: " + token);
            
            String otp = (String) payload.get("otp");
            System.out.println("🔐 OTP reçu: " + otp);

            // 1. Récupérer l'utilisateur
            Utilisateur actuel = utilisateurRepository.findByEmail(emailConnecte)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + emailConnecte));
            
            System.out.println("👤 Utilisateur: " + actuel.getEmail());
            System.out.println("📊 Statut PKI: " + actuel.getStatusPki());

            // 2. Vérifier/créer l'identité HSM
            System.out.println("🔐 Vérification de l'identité HSM...");
            try {
                serviceHSM.verifierOuCreerIdentite(actuel.getEmail(), actuel);
                utilisateurRepository.save(actuel);
                System.out.println("✅ Identité HSM vérifiée/créée");
            } catch (Exception e) {
                System.err.println("❌ Erreur HSM: " + e.getMessage());
                return ResponseEntity.status(500).body(Map.of("erreur", "Erreur HSM: " + e.getMessage()));
            }
            
            if (!"ACTIVE".equals(actuel.getStatusPki())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "erreur", "Votre certificat n'est pas actif. Statut actuel: " + actuel.getStatusPki()
                ));
            }

            // 3. Récupérer l'invitation
            InvitationSignature invitation = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation non trouvée pour token: " + token));

            if ("SIGNE".equals(invitation.getStatut())) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Ce document a déjà été signé"));
            }

            // 4. Récupération du document
            Document doc = invitation.getDocument();
            byte[] pdfOriginal = serviceDocument.getContenu(doc.getId());
            
            if (pdfOriginal == null || pdfOriginal.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Le contenu du document est vide"));
            }
            
            String nom = (actuel.getPrenom() != null ? actuel.getPrenom() : "") + " " + (actuel.getNom() != null ? actuel.getNom() : "");
            String email = actuel.getEmail();

            float x = Float.parseFloat(payload.get("x").toString());
            float y = Float.parseFloat(payload.get("y").toString());
            int page = Integer.parseInt(payload.get("pageNumber").toString());
            float displayWidth = payload.containsKey("displayWidth") ? Float.parseFloat(payload.get("displayWidth").toString()) : 800;
            float displayHeight = payload.containsKey("displayHeight") ? Float.parseFloat(payload.get("displayHeight").toString()) : 600;

            String aliasHSM = actuel.getEmail();

            // 5. Exécution de la signature PKI
            System.out.println("🔐 Exécution de la signature PKI...");
            byte[] pdfSigne = serviceSignaturePki.signerDocumentPki(
                    pdfOriginal, nom, email, otp,
                    x, y, page,
                    displayWidth, displayHeight, aliasHSM, doc.getId()
            );

            // 6. Mise à jour de l'invitation
            invitation.setStatut("SIGNE");
            invitation.setDateSignature(LocalDateTime.now());
            invitation.setCoordonneeX((double) x);
            invitation.setCoordonneeY((double) y);
            invitation.setPageNumber(page);
            invitationRepository.save(invitation);

            // 7. Sauvegarde du document signé
            String nouveauNom = "SIGNE_PKI_" + doc.getNomFichier();
            String cheminStockage = serviceDocument.sauvegarderSurDisque(doc.getId(), pdfSigne, nouveauNom);

            // 8. Mise à jour des métadonnées
            doc.setCheminStockage(cheminStockage);
            doc.setNomFichier(nouveauNom);
            doc.setEstSigne(true);
            doc.setStatut(StatutDocument.SIGNE);
            doc.setDateHorodatage(LocalDateTime.now());
            doc.setSignataire(actuel);
            documentRepository.save(doc);

            // 9. Audit
            serviceAudit.logSignatureDocument(
                    actuel.getId(), actuel.getEmail(),
                    doc.getId(), doc.getNomFichier(),
                    "PKI", "SUCCESS", "Signature PKI avec certificat", httpServletRequest
            );

            System.out.println("🎉 Signature PKI réussie pour: " + emailConnecte);
            System.out.println("========================================\n");
            
            // 10. Retourner le PDF signé
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", nouveauNom);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfSigne);

        } catch (Exception e) {
            System.err.println("❌ ERREUR SIGNATURE PKI: " + e.getMessage());
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