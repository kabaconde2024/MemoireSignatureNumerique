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
        System.out.println("========================================");
        System.out.println("=== DÉBUT SIGNATURE PKI ===");
        System.out.println("Timestamp: " + LocalDateTime.now());
        System.out.println("Payload reçu: " + payload);
        
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

        // 1. Vérification de l'utilisateur
        System.out.println("🔍 Recherche de l'utilisateur...");
        Optional<Utilisateur> userOpt = utilisateurRepository.findByEmail(emailConnecte);
        if (userOpt.isEmpty()) {
            System.err.println("❌ Utilisateur non trouvé: " + emailConnecte);
            return ResponseEntity.status(404).body(Map.of("erreur", "Utilisateur non trouvé"));
        }
        
        Utilisateur actuel = userOpt.get();
        System.out.println("✅ Utilisateur trouvé: " + actuel.getEmail());
        System.out.println("📊 Statut PKI: " + actuel.getStatusPki());

        if (!"ACTIVE".equals(actuel.getStatusPki())) {
            System.err.println("❌ Certificat non actif. Statut: " + actuel.getStatusPki());
            return ResponseEntity.badRequest().body(Map.of(
                    "erreur", "Votre certificat n'est pas actif. Statut actuel: " + actuel.getStatusPki()
            ));
        }
        System.out.println("✅ Certificat actif");

        // 2. Vérification de l'invitation
        System.out.println("🔍 Recherche de l'invitation...");
        Optional<InvitationSignature> invOpt = invitationRepository.findByTokenSignature(token);
        if (invOpt.isEmpty()) {
            System.err.println("❌ Invitation non trouvée pour token: " + token);
            return ResponseEntity.status(404).body(Map.of("erreur", "Invitation non trouvée"));
        }
        
        InvitationSignature invitation = invOpt.get();
        System.out.println("✅ Invitation trouvée");
        System.out.println("📄 Statut invitation: " + invitation.getStatut());

        if ("SIGNE".equals(invitation.getStatut())) {
            System.err.println("❌ Document déjà signé");
            return ResponseEntity.badRequest().body(Map.of("erreur", "Ce document a déjà été signé"));
        }

        // 3. Récupération du document
        Document doc = invitation.getDocument();
        if (doc == null) {
            System.err.println("❌ Document associé à l'invitation est null");
            return ResponseEntity.status(404).body(Map.of("erreur", "Document non trouvé"));
        }
        
        System.out.println("📄 Document ID: " + doc.getId());
        System.out.println("📄 Nom fichier: " + doc.getNomFichier());
        
        System.out.println("🔍 Récupération du contenu PDF...");
        byte[] pdfOriginal = null;
        try {
            pdfOriginal = serviceDocument.getContenu(doc.getId());
        } catch (Exception e) {
            System.err.println("❌ Erreur récupération contenu: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("erreur", "Erreur récupération du document: " + e.getMessage()));
        }
        
        if (pdfOriginal == null || pdfOriginal.length == 0) {
            System.err.println("❌ Contenu PDF vide ou null");
            return ResponseEntity.badRequest().body(Map.of("erreur", "Le contenu du document est vide"));
        }
        System.out.println("✅ PDF original chargé, taille: " + pdfOriginal.length + " bytes");

        // 4. Préparation des données de signature
        String nom = (actuel.getPrenom() != null ? actuel.getPrenom() : "") + " " + (actuel.getNom() != null ? actuel.getNom() : "");
        String email = actuel.getEmail();
        System.out.println("👤 Signataire: " + nom);
        System.out.println("📧 Email pour OTP: " + email);

        float x = Float.parseFloat(payload.get("x").toString());
        float y = Float.parseFloat(payload.get("y").toString());
        int page = Integer.parseInt(payload.get("pageNumber").toString());
        float displayWidth = payload.containsKey("displayWidth") ? Float.parseFloat(payload.get("displayWidth").toString()) : 800;
        float displayHeight = payload.containsKey("displayHeight") ? Float.parseFloat(payload.get("displayHeight").toString()) : 600;
        
        System.out.println("📍 Coordonnées de signature:");
        System.out.println("   - Page: " + page);
        System.out.println("   - X: " + x);
        System.out.println("   - Y: " + y);

        String aliasHSM = actuel.getEmail();
        System.out.println("🔑 Alias HSM: " + aliasHSM);

        // 5. Exécution de la signature PKI
        System.out.println("🔐 Appel de la signature PKI...");
        byte[] pdfSigne = null;
        try {
            pdfSigne = serviceSignaturePki.signerDocumentPki(
                    pdfOriginal, nom, email, otp,
                    x, y, page,
                    displayWidth, displayHeight, aliasHSM, doc.getId()
            );
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la signature PKI: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("erreur", "Erreur signature PKI: " + e.getMessage()));
        }
        
        if (pdfSigne == null || pdfSigne.length == 0) {
            System.err.println("❌ Échec de la signature - PDF signé vide");
            return ResponseEntity.status(500).body(Map.of("erreur", "La signature a échoué, PDF signé vide"));
        }
        System.out.println("✅ Signature PKI réussie, taille: " + pdfSigne.length + " bytes");

        // 6. Mise à jour de l'invitation
        System.out.println("📝 Mise à jour de l'invitation...");
        invitation.setStatut("SIGNE");
        invitation.setDateSignature(LocalDateTime.now());
        invitation.setCoordonneeX((double) x);
        invitation.setCoordonneeY((double) y);
        invitation.setPageNumber(page);
        invitationRepository.save(invitation);
        System.out.println("✅ Invitation mise à jour");

        // 7. Sauvegarde du document signé
        System.out.println("💾 Sauvegarde du document signé...");
        String nouveauNom = "SIGNE_PKI_" + doc.getNomFichier();
        String cheminStockage = serviceDocument.sauvegarderSurDisque(doc.getId(), pdfSigne, nouveauNom);
        System.out.println("✅ Document sauvegardé: " + nouveauNom);

        // 8. Mise à jour des métadonnées du document
        System.out.println("📝 Mise à jour des métadonnées...");
        doc.setCheminStockage(cheminStockage);
        doc.setNomFichier(nouveauNom);
        doc.setEstSigne(true);
        doc.setStatut(StatutDocument.SIGNE);
        doc.setDateHorodatage(LocalDateTime.now());
        doc.setSignataire(actuel);
        
        String signatureBase64 = Base64.getEncoder().encodeToString(pdfSigne);
        doc.setSignatureNumerique(signatureBase64);
        
        documentRepository.save(doc);
        System.out.println("✅ Métadonnées mises à jour");

        // 9. Audit
        System.out.println("📝 Enregistrement audit...");
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

    } catch (NumberFormatException e) {
        System.err.println("❌ Erreur de format de nombre: " + e.getMessage());
        return ResponseEntity.badRequest().body(Map.of("erreur", "Format de coordonnées invalide: " + e.getMessage()));
    } catch (Exception e) {
        System.err.println("========================================");
        System.err.println("❌ ERREUR SIGNATURE PKI");
        System.err.println("Message: " + e.getMessage());
        System.err.println("Classe: " + e.getClass().getName());
        e.printStackTrace();
        System.err.println("========================================\n");
        
        return ResponseEntity.internalServerError().body(Map.of(
            "erreur", "Erreur interne: " + e.getMessage(),
            "type", e.getClass().getSimpleName()
        ));
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