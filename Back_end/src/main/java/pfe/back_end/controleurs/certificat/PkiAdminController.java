package pfe.back_end.controleurs.certificat;

import org.bouncycastle.util.encoders.Base64;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.audit.ServiceAudit;
import pfe.back_end.services.ca.ServiceAutoriteCertification;
import pfe.back_end.services.ca.ServiceVerificationCertificat;
import pfe.back_end.services.hsm.ServiceGestionClesHSM;

import jakarta.annotation.PostConstruct;

import java.io.ByteArrayInputStream;
import java.security.cert.CertificateExpiredException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/pki")
@CrossOrigin(origins = {
    "https://localhost:3000",
    "http://localhost:3000", 
    "https://memoire-frontend.onrender.com"  // ← AJOUTEZ CETTE LIGNE
}, allowCredentials = "true")


public class PkiAdminController {

    private final ServiceGestionClesHSM hsmService;
    private final ServiceAutoriteCertification caService;
    private final UtilisateurRepository utilisateurRepository;
    private final ServiceVerificationCertificat serviceVerificationCertificat;

    @Autowired
    private ServiceAudit serviceAudit;

    // ✅ Injection par constructeur
    public PkiAdminController(ServiceGestionClesHSM hsmService,
                              ServiceAutoriteCertification caService,
                              UtilisateurRepository utilisateurRepository,
                              ServiceVerificationCertificat serviceVerificationCertificat) {
        this.hsmService = hsmService;
        this.caService = caService;
        this.utilisateurRepository = utilisateurRepository;
        this.serviceVerificationCertificat = serviceVerificationCertificat;
    }

    @PostConstruct
    public void init() {
        System.out.println("✅ hsmService = " + hsmService);
        System.out.println("✅ caService = " + caService);
        System.out.println("✅ utilisateurRepository = " + utilisateurRepository);
        System.out.println("✅ serviceVerificationCertificat = " + serviceVerificationCertificat);
    }

    @PostMapping("/approve/{userId}")
    public ResponseEntity<?> approuverEtGenererCertificat(@PathVariable Long userId) {
        try {
            Utilisateur user = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            String alias = user.getEmail();

            System.out.println("🔐 Génération certificat pour alias: " + alias);

            // 1. Génération des clés + certificat temporaire dans le HSM
            hsmService.genererIdentiteSecurisee(alias);

            // 2. Création CSR
            String csrPem = hsmService.creerDemandeCertification(alias, user);

            // 3. Signature CA
            String certificatPem = caService.signerDemandeUtilisateur(csrPem);

            // 4. Remplacer le certificat temporaire par le vrai certificat signé
            hsmService.stockerCertificatFinal(alias, certificatPem);

            // 5. Mise à jour DB
            user.setCertificatPem(certificatPem);
            user.setStatusPki("ACTIVE");
            user.setHsmAlias(alias);
            utilisateurRepository.save(user);

            System.out.println("✅ Certificat généré avec succès pour alias: " + alias);
            serviceAudit.logApprobationCertificat(user.getId(), user.getEmail(), alias, "SUCCESS", "Certificat généré et approuvé");
            return ResponseEntity.ok(Map.of("status", "success", "message", "Certificat généré avec succès"));

        } catch (Exception e) {
            e.printStackTrace();
            serviceAudit.logApprobationCertificat(userId, null, null, "FAILED", e.getMessage());

            return ResponseEntity.internalServerError().body(Map.of("error", "Erreur PKI : " + e.getMessage()));
        }
    }

    // ⚠️ SUPPRIMER OU COMMENTER CETTE MÉTHODE (conflit avec SuperAdminController)
    // @GetMapping("/stats")
    // public ResponseEntity<Map<String, Long>> getPkiStats() {
    //     Map<String, Long> stats = new HashMap<>();
    //     stats.put("pending", utilisateurRepository.countByStatusPki("PENDING"));
    //     stats.put("active", utilisateurRepository.countByStatusPki("ACTIVE"));
    //     return ResponseEntity.ok(stats);
    // }

    @GetMapping("/requests")
    public ResponseEntity<List<Utilisateur>> getPendingRequests() {
        return ResponseEntity.ok(utilisateurRepository.findAllByStatusPki("PENDING"));
    }

    @GetMapping("/demandes-en-attente")
    public ResponseEntity<List<Utilisateur>> listerDemandesEnAttente() {
        return ResponseEntity.ok(utilisateurRepository.findAllByStatusPki("PENDING"));
    }

    @GetMapping("/certificats-actifs")
    public ResponseEntity<List<Map<String, Object>>> listerCertificatsActifs() {
        List<Utilisateur> utilisateursActifs = utilisateurRepository.findAllByStatusPki("ACTIVE");

        List<Map<String, Object>> reponse = utilisateursActifs.stream()
                .filter(user -> {
                    // ✅ Vérifier si le certificat est encore valide (non expiré)
                    if (user.getCertificatPem() == null) return false;
                    try {
                        CertificateFactory fact = CertificateFactory.getInstance("X.509");
                        X509Certificate cer = (X509Certificate) fact.generateCertificate(
                                new ByteArrayInputStream(user.getCertificatPem().getBytes())
                        );
                        // Vérifier la date d'expiration
                        cer.checkValidity();
                        return true; // Certificat valide
                    } catch (CertificateExpiredException e) {
                        System.out.println("⚠️ Certificat expiré pour l'utilisateur: " + user.getEmail());
                        // Mettre à jour le statut en base
                        user.setStatusPki("EXPIRED");
                        utilisateurRepository.save(user);
                        return false;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .map(user -> {
                    Map<String, Object> infos = new HashMap<>();
                    infos.put("id", user.getId());
                    infos.put("nomComplet", user.getNom() + " " + user.getPrenom());
                    infos.put("email", user.getEmail());
                    infos.put("aliasHsm", user.getHsmAlias());
                    infos.put("certificatPem", user.getCertificatPem());

                    try {
                        CertificateFactory fact = CertificateFactory.getInstance("X.509");
                        X509Certificate cer = (X509Certificate) fact.generateCertificate(
                                new ByteArrayInputStream(user.getCertificatPem().getBytes())
                        );

                        infos.put("dateEmission", cer.getNotBefore());
                        infos.put("dateExpiration", cer.getNotAfter());
                        infos.put("numeroSerie", cer.getSerialNumber().toString(16).toUpperCase());
                        infos.put("algorithme", cer.getSigAlgName());

                        String clePubliqueBase64 = Base64.toBase64String(cer.getPublicKey().getEncoded());
                        infos.put("clePublique", clePubliqueBase64);
                        infos.put("sujet", cer.getSubjectX500Principal().getName());

                    } catch (Exception e) {
                        infos.put("erreur", "Impossible de lire les détails du certificat: " + e.getMessage());
                    }

                    return infos;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(reponse);
    }

    @GetMapping("/verifier-certificat/{userId}")
    public ResponseEntity<?> verifierCertificatUtilisateur(@PathVariable Long userId) {
        try {
            Utilisateur user = utilisateurRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            if (user.getCertificatPem() == null) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Aucun certificat trouvé"));
            }

            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            String pemClean = user.getCertificatPem()
                    .replace("-----BEGIN CERTIFICATE-----", "")
                    .replace("-----END CERTIFICATE-----", "")
                    .replaceAll("\\s", "");
            byte[] certBytes = java.util.Base64.getDecoder().decode(pemClean);
            X509Certificate certificat = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));

            ServiceVerificationCertificat.VerificationResult result =
                    serviceVerificationCertificat.verifierCertificat(user, certificat);

            return ResponseEntity.ok(Map.of(
                    "valide", result.isValid(),
                    "resume", result.getResume(),
                    "infos", result.getInfos(),
                    "warnings", result.getWarnings(),
                    "erreurs", result.getErreurs(),
                    "sujet", certificat.getSubjectX500Principal().getName(),
                    "emetteur", certificat.getIssuerX500Principal().getName(),
                    "dateEmission", certificat.getNotBefore(),
                    "dateExpiration", certificat.getNotAfter()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

    @GetMapping("/verifier-mon-certificat")
    public ResponseEntity<?> verifierMonCertificat(Authentication auth) {
        try {
            Utilisateur user = utilisateurRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            if (user.getCertificatPem() == null) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Aucun certificat trouvé"));
            }

            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            String pemClean = user.getCertificatPem()
                    .replace("-----BEGIN CERTIFICATE-----", "")
                    .replace("-----END CERTIFICATE-----", "")
                    .replaceAll("\\s", "");
            byte[] certBytes = java.util.Base64.getDecoder().decode(pemClean);
            X509Certificate certificat = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));

            ServiceVerificationCertificat.VerificationResult result =
                    serviceVerificationCertificat.verifierCertificat(user, certificat);

            return ResponseEntity.ok(Map.of(
                    "valide", result.isValid(),
                    "resume", result.getResume(),
                    "infos", result.getInfos(),
                    "warnings", result.getWarnings(),
                    "erreurs", result.getErreurs()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }

    @GetMapping("/nettoyer-certificats-expires")
    public ResponseEntity<?> nettoyerCertificatsExpires() {
        List<Utilisateur> utilisateursActifs = utilisateurRepository.findAllByStatusPki("ACTIVE");
        int compteurExpires = 0;

        for (Utilisateur user : utilisateursActifs) {
            if (user.getCertificatPem() == null) continue;
            try {
                CertificateFactory fact = CertificateFactory.getInstance("X.509");
                X509Certificate cer = (X509Certificate) fact.generateCertificate(
                        new ByteArrayInputStream(user.getCertificatPem().getBytes())
                );
                cer.checkValidity();
            } catch (CertificateExpiredException e) {
                user.setStatusPki("EXPIRED");
                utilisateurRepository.save(user);
                compteurExpires++;
                System.out.println("📅 Certificat expiré pour: " + user.getEmail());
            } catch (Exception e) {
                // Ignorer
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Nettoyage terminé",
                "certificatsExpires", compteurExpires
        ));
    }
}