package pfe.back_end.services.hsm;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.pkcs.PKCS10CertificationRequest;
import org.bouncycastle.pkcs.jcajce.JcaPKCS10CertificationRequestBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pfe.back_end.modeles.entites.Utilisateur;

import java.math.BigInteger;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Date;

@Service
public class ServiceGestionClesHSM {

    @Value("${hsm.pin.utilisateur:1234}")
    private String pinUtilisateur;
    private Provider fournisseurPKCS11;


private Provider initialiserFournisseur() {
        if (fournisseurPKCS11 == null) {
            try {
                String os = System.getProperty("os.name").toLowerCase();
                StringBuilder configContent = new StringBuilder();
                configContent.append("name = SoftHSM2\n");

                if (os.contains("win")) {
                    configContent.append("library = C:/SoftHSM2/lib/softhsm2-x64.dll\n");
                    configContent.append("slot = 2145520111\n");
                } else {
                    // Chemins Linux pour Render
                    String pathA = "/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so";
                    String pathB = "/usr/lib/softhsm/libsofthsm2.so";
                    File libFile = new File(pathA);
                    String finalPath = libFile.exists() ? pathA : pathB;

                    configContent.append("library = ").append(finalPath).append("\n");
                    configContent.append("slot = 0\n");
                }

                // Création du fichier de config temporaire
                File tempConfig = File.createTempFile("softhsm2_render", ".cfg");
                Files.writeString(tempConfig.toPath(), configContent.toString());
                
                // Initialisation spécifique Java 9+
                Provider p = Security.getProvider("SunPKCS11");
                fournisseurPKCS11 = p.configure(tempConfig.getAbsolutePath());
                Security.addProvider(fournisseurPKCS11);

                System.out.println("✅ HSM initialisé sur : " + os);
            } catch (Exception e) {
                throw new RuntimeException("Erreur PKI : " + e.getMessage());
            }
        }
        return fournisseurPKCS11;
    }

    public void genererIdentiteSecurisee(String aliasUtilisateur) throws Exception {
        KeyStore ks = getKeyStore();

        if (!ks.containsAlias(aliasUtilisateur)) {
            // 1. Génération de la paire de clés
            KeyPairGenerator generateurCles = KeyPairGenerator.getInstance("RSA", initialiserFournisseur());
            generateurCles.initialize(2048);
            KeyPair paireCles = generateurCles.generateKeyPair();

            // 2. Création d'un certificat auto-signé temporaire
            X509Certificate certTemporaire = genererCertificatTemporaire(paireCles, aliasUtilisateur);

            // 3. Stockage de la clé privée AVEC le certificat temporaire
            ks.setKeyEntry(aliasUtilisateur, paireCles.getPrivate(), null, new Certificate[]{certTemporaire});

            System.out.println("🔐 Clé privée et certificat temporaire générés pour alias: " + aliasUtilisateur);
        } else {
            System.out.println("ℹ️ L'alias '" + aliasUtilisateur + "' existe déjà dans le HSM.");
        }
    }

    private X509Certificate genererCertificatTemporaire(KeyPair kp, String alias) throws Exception {
        long now = System.currentTimeMillis();
        Date start = new Date(now);
        Date expiry = new Date(now + (365L * 24 * 60 * 60 * 1000)); // 1 an

        org.bouncycastle.asn1.x500.X500Name dnName = new org.bouncycastle.asn1.x500.X500Name("CN=TEMP_" + alias);
        BigInteger certSerialNumber = new BigInteger(Long.toString(now));

        org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder certBuilder =
                new org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder(
                        dnName, certSerialNumber, start, expiry, dnName, kp.getPublic());

        org.bouncycastle.operator.ContentSigner signer =
                new org.bouncycastle.operator.jcajce.JcaContentSignerBuilder("SHA256withRSA")
                        .setProvider(initialiserFournisseur())
                        .build(kp.getPrivate());

        return new org.bouncycastle.cert.jcajce.JcaX509CertificateConverter()
                .setProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider())
                .getCertificate(certBuilder.build(signer));
    }


    public String creerDemandeCertification(String aliasUtilisateur, Utilisateur utilisateur) throws Exception {
        KeyStore coffreFort = KeyStore.getInstance("PKCS11", initialiserFournisseur());
        coffreFort.load(null, pinUtilisateur.toCharArray());

        PrivateKey clePrivee = (PrivateKey) coffreFort.getKey(aliasUtilisateur, null);
        PublicKey clePublique = coffreFort.getCertificate(aliasUtilisateur).getPublicKey();

        X500Name nomDistingue = new X500Name("CN=" + utilisateur.getPrenom() + " " + utilisateur.getNom() +
                ", E=" + utilisateur.getEmail() + ", O=TrustSign, C=TN");

        JcaPKCS10CertificationRequestBuilder constructeurCSR = new JcaPKCS10CertificationRequestBuilder(nomDistingue, clePublique);

        ContentSigner signataireInterne = new JcaContentSignerBuilder("SHA256withRSA")
                .setProvider(initialiserFournisseur())
                .build(clePrivee);

        PKCS10CertificationRequest csr = constructeurCSR.build(signataireInterne);

        return "-----BEGIN CERTIFICATE REQUEST-----\n" +
                Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(csr.getEncoded()) +
                "\n-----END CERTIFICATE REQUEST-----";
    }

    public void stockerCertificatFinal(String aliasUtilisateur, String certificatSignePem) throws Exception {
        KeyStore ks = getKeyStore();

        // Décoder le certificat PEM
        String pemClean = certificatSignePem
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll("\\s", "");
        byte[] certBytes = Base64.getDecoder().decode(pemClean);

        java.security.cert.CertificateFactory cf = java.security.cert.CertificateFactory.getInstance("X.509");
        X509Certificate vraiCertificat = (X509Certificate) cf.generateCertificate(new java.io.ByteArrayInputStream(certBytes));

        // Récupérer la clé privée existante
        PrivateKey privateKey = (PrivateKey) ks.getKey(aliasUtilisateur, null);

        if (privateKey == null) {
            throw new RuntimeException("Clé privée non trouvée pour l'alias: " + aliasUtilisateur);
        }

        // Remplacer l'entrée avec le vrai certificat
        ks.setKeyEntry(aliasUtilisateur, privateKey, null, new Certificate[]{vraiCertificat});

        System.out.println("✅ Certificat réel lié avec succès dans le HSM pour " + aliasUtilisateur);
    }

    // ✅ Méthodes pour la signature PKI
    public PrivateKey recupererClePrivee(String alias) throws Exception {
        KeyStore ks = getKeyStore();
        PrivateKey key = (PrivateKey) ks.getKey(alias, null);
        if (key == null) {
            System.err.println("❌ Clé privée non trouvée pour l'alias: " + alias);
        }
        return key;
    }

    public X509Certificate recupererCertificat(String alias) throws Exception {
        KeyStore ks = getKeyStore();
        // Essayer d'abord avec _cert, puis avec l'alias direct
        java.security.cert.Certificate cert = ks.getCertificate(alias + "_cert");
        if (cert == null) {
            cert = ks.getCertificate(alias);
        }
        if (cert == null) {
            System.err.println("❌ Certificat non trouvé pour l'alias: " + alias);
            return null;
        }
        return (X509Certificate) cert;
    }

    public Certificate[] recupererChaineCertificats(String alias) throws Exception {
        KeyStore ks = getKeyStore();
        Certificate[] chain = ks.getCertificateChain(alias);
        if (chain == null || chain.length == 0) {
            X509Certificate cert = recupererCertificat(alias);
            if (cert != null) {
                chain = new Certificate[]{cert};
            }
        }
        return chain;
    }

    private KeyStore getKeyStore() throws Exception {
        Provider provider = initialiserFournisseur();
        if (provider == null) {
            throw new RuntimeException("Impossible d'initialiser le provider PKCS11");
        }
        KeyStore ks = KeyStore.getInstance("PKCS11", provider);
        ks.load(null, pinUtilisateur.toCharArray());
        return ks;
    }
}