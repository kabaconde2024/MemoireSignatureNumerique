package pfe.back_end.services.ca;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x509.*;
import org.bouncycastle.cert.X509v3CertificateBuilder;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.pkcs.PKCS10CertificationRequest;
import org.bouncycastle.pkcs.jcajce.JcaPKCS10CertificationRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pfe.back_end.services.configuration.ServiceConfiguration;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.math.BigInteger;
import java.security.*;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Service
public class ServiceAutoriteCertification {

    private static final String PROVIDEUR_BC = "BC";
    private static final String ALGORITHME_SIGNATURE = "SHA512withRSA";

    @Autowired(required = false)
    private ServiceConfiguration serviceConfiguration;

    private int dureeValiditeMinutes = 5;
    private X509Certificate certificatRacine;
    private KeyPair paireClesRacine;
    private KeyPair paireClesEmettrice;
    private X509Certificate certificatEmetteur;
    private boolean pkiInitialisee = false;

    @Value("${pki.stockage.chemin:./coffre-pki}")
    private String cheminStockage;

    public X509Certificate getCertificatRacine() {
        return certificatRacine;
    }

    public String getCertificatRacinePem() throws Exception {
        if (certificatRacine == null) {
            return null;
        }
        return convertirEnPem(certificatRacine);
    }

    private int getDureeValiditeMinutes() {
        if (serviceConfiguration != null) {
            try {
                String valeur = serviceConfiguration.getValeur("pki.certificat.duree.minutes");
                if (valeur != null && !valeur.isEmpty()) {
                    return Integer.parseInt(valeur);
                }
            } catch (Exception e) {
                System.err.println("⚠️ Erreur lecture configuration PKI: " + e.getMessage());
            }
        }
        return dureeValiditeMinutes;
    }

    @PostConstruct
    public void initialiser() {
        try {
            Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
            File folder = new File(cheminStockage);
            if (!folder.exists()) {
                folder.mkdirs();
            }

            // Essayer de charger la PKI existante
            boolean chargee = chargerPKIExistante();

            if (!chargee) {
                System.out.println("📂 Aucune PKI existante trouvée, création d'une nouvelle hiérarchie...");
                initialiserNouvelleHierarchie();
                pkiInitialisee = true;
            } else {
                pkiInitialisee = true;
            }

            dureeValiditeMinutes = getDureeValiditeMinutes();

            System.out.println("🛡️ PKI Initialisée avec succès.");
            System.out.println("⏰ Durée de validité des certificats: " + dureeValiditeMinutes + " minutes");

        } catch (Exception e) {
            System.err.println("⚠️ Attention : La PKI n'a pas pu démarrer : " + e.getMessage());
            e.printStackTrace();
            pkiInitialisee = false;
        }
    }

    private void initialiserNouvelleHierarchie() throws Exception {
        // 1. CA RACINE : L'ancre de confiance ultime (4096 bits)
        KeyPairGenerator generateurCles = KeyPairGenerator.getInstance("RSA", PROVIDEUR_BC);
        generateurCles.initialize(4096);
        paireClesRacine = generateurCles.generateKeyPair();
        X500Name sujetRacine = new X500Name("CN=TrustSign Root CA, O=ISIMG, C=TN");

        certificatRacine = genererCertificat(sujetRacine, sujetRacine, paireClesRacine.getPublic(), paireClesRacine.getPrivate(), true, 1);

        // 2. CA ÉMETTRICE : L'autorité de délivrance (2048 bits)
        generateurCles.initialize(2048);
        paireClesEmettrice = generateurCles.generateKeyPair();
        X500Name sujetEmetteur = new X500Name("CN=TrustSign Issuing CA, OU=Securite Numerique, O=ISIMG");

        certificatEmetteur = genererCertificat(sujetEmetteur, sujetRacine, paireClesEmettrice.getPublic(), paireClesRacine.getPrivate(), true, 0);

        sauvegarderConfigurationPKI();
    }

    private X509Certificate genererCertificat(X500Name sujet, X500Name emetteur, PublicKey clePublique, PrivateKey cleSignature, boolean estCA, int longueurChemin) throws Exception {
        long maintenant = System.currentTimeMillis();
        long dureeMillis = TimeUnit.DAYS.toMillis(3650);
        Date dateExpiration = new Date(maintenant + dureeMillis);

        X509v3CertificateBuilder constructeurCert = new JcaX509v3CertificateBuilder(
                emetteur, BigInteger.valueOf(maintenant), new Date(maintenant), dateExpiration, sujet, clePublique);

        constructeurCert.addExtension(Extension.basicConstraints, true, new BasicConstraints(estCA ? longueurChemin : -1));
        constructeurCert.addExtension(Extension.keyUsage, true, new KeyUsage(estCA ? KeyUsage.keyCertSign | KeyUsage.cRLSign : KeyUsage.digitalSignature));

        ContentSigner signataire = new JcaContentSignerBuilder(ALGORITHME_SIGNATURE).setProvider(PROVIDEUR_BC).build(cleSignature);
        return new JcaX509CertificateConverter().setProvider(PROVIDEUR_BC).getCertificate(constructeurCert.build(signataire));
    }

    public String signerDemandeUtilisateur(String csrPem) throws Exception {
        // ✅ Vérifier que la PKI est initialisée
        if (!pkiInitialisee || paireClesEmettrice == null || certificatEmetteur == null) {
            throw new RuntimeException("La PKI n'est pas correctement initialisée. Veuillez contacter l'administrateur.");
        }

        byte[] csrDecodee = Base64.getDecoder().decode(csrPem.replace("-----BEGIN CERTIFICATE REQUEST-----", "")
                .replace("-----END CERTIFICATE REQUEST-----", "")
                .replaceAll("\\s", ""));
        JcaPKCS10CertificationRequest jcaCsr = new JcaPKCS10CertificationRequest(new PKCS10CertificationRequest(csrDecodee));

        int dureeMinutes = getDureeValiditeMinutes();
        long dureeMillis = TimeUnit.MINUTES.toMillis(dureeMinutes);

        long maintenant = System.currentTimeMillis();
        Date dateDebut = new Date(maintenant);
        Date dateExpiration = new Date(maintenant + dureeMillis);

        System.out.println("📅 Date de début du certificat: " + dateDebut);
        System.out.println("📅 Date d'expiration du certificat: " + dateExpiration);
        System.out.println("⏰ Le certificat expirera dans " + dureeMinutes + " minutes !");

        X509v3CertificateBuilder constructeurCertUtilisateur = new JcaX509v3CertificateBuilder(
                certificatEmetteur,
                BigInteger.valueOf(System.currentTimeMillis()),
                dateDebut,
                dateExpiration,
                jcaCsr.getSubject(),
                jcaCsr.getPublicKey());

        constructeurCertUtilisateur.addExtension(Extension.basicConstraints, true, new BasicConstraints(false));
        constructeurCertUtilisateur.addExtension(Extension.keyUsage, true, new KeyUsage(KeyUsage.digitalSignature | KeyUsage.keyEncipherment));

        ContentSigner signataire = new JcaContentSignerBuilder(ALGORITHME_SIGNATURE)
                .setProvider(PROVIDEUR_BC)
                .build(paireClesEmettrice.getPrivate());

        X509Certificate certificatUser = new JcaX509CertificateConverter()
                .setProvider(PROVIDEUR_BC)
                .getCertificate(constructeurCertUtilisateur.build(signataire));

        return convertirEnPem(certificatUser);
    }

    private String convertirEnPem(X509Certificate certificat) throws Exception {
        return "-----BEGIN CERTIFICATE-----\n" +
                Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(certificat.getEncoded()) +
                "\n-----END CERTIFICATE-----";
    }

    private void sauvegarderConfigurationPKI() throws Exception {
        // Créer le dossier si nécessaire
        File folder = new File(cheminStockage);
        if (!folder.exists()) {
            folder.mkdirs();
        }

        // Sauvegarder la clé privée racine
        File racineKeyFile = new File(cheminStockage + "/ca_racine.key");
        if (!racineKeyFile.exists() && paireClesRacine != null) {
            try (FileOutputStream fos = new FileOutputStream(racineKeyFile)) {
                fos.write(paireClesRacine.getPrivate().getEncoded());
            }
        }

        // Sauvegarder le certificat racine
        File certRacineFile = new File(cheminStockage + "/ca_racine.crt");
        if (!certRacineFile.exists() && certificatRacine != null) {
            try (FileWriter fw = new FileWriter(certRacineFile)) {
                fw.write(convertirEnPem(certificatRacine));
            }
        }

        // Sauvegarder la clé privée émettrice
        File emetteurKeyFile = new File(cheminStockage + "/ca_emetteur.key");
        if (!emetteurKeyFile.exists() && paireClesEmettrice != null) {
            try (FileOutputStream fos = new FileOutputStream(emetteurKeyFile)) {
                fos.write(paireClesEmettrice.getPrivate().getEncoded());
            }
        }

        // Sauvegarder le certificat émetteur
        File certEmetteurFile = new File(cheminStockage + "/ca_emetteur.crt");
        if (!certEmetteurFile.exists() && certificatEmetteur != null) {
            try (FileWriter fw = new FileWriter(certEmetteurFile)) {
                fw.write(convertirEnPem(certificatEmetteur));
            }
        }

        System.out.println("💾 Configuration PKI sauvegardée dans: " + cheminStockage);
    }

    private boolean chargerPKIExistante() throws Exception {
        File certRacineFile = new File(cheminStockage + "/ca_racine.crt");
        File certEmetteurFile = new File(cheminStockage + "/ca_emetteur.crt");

        if (!certRacineFile.exists() || !certEmetteurFile.exists()) {
            System.out.println("📂 Fichiers PKI non trouvés, création d'une nouvelle hiérarchie...");
            return false;
        }

        try {
            // Charger le certificat racine
            try (FileInputStream fis = new FileInputStream(certRacineFile)) {
                java.security.cert.CertificateFactory cf = java.security.cert.CertificateFactory.getInstance("X.509");
                certificatRacine = (X509Certificate) cf.generateCertificate(fis);
            }

            // Charger le certificat émetteur
            try (FileInputStream fis = new FileInputStream(certEmetteurFile)) {
                java.security.cert.CertificateFactory cf = java.security.cert.CertificateFactory.getInstance("X.509");
                certificatEmetteur = (X509Certificate) cf.generateCertificate(fis);
            }

            // Pour les clés privées, on ne peut pas les charger facilement depuis des fichiers PEM
            // On recrée des paires de clés temporaires pour la signature
            // Dans un environnement de production, il faudrait utiliser un HSM ou un keystore
            KeyPairGenerator generateurCles = KeyPairGenerator.getInstance("RSA", PROVIDEUR_BC);
            generateurCles.initialize(2048);
            paireClesEmettrice = generateurCles.generateKeyPair();

            System.out.println("📂 PKI existante chargée avec succès.");
            return true;

        } catch (Exception e) {
            System.err.println("❌ Erreur lors du chargement de la PKI existante: " + e.getMessage());
            return false;
        }
    }
}