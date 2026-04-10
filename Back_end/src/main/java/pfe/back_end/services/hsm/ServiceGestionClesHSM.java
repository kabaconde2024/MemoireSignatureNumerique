package pfe.back_end.services.hsm;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.pkcs.PKCS10CertificationRequest;
import org.bouncycastle.pkcs.jcajce.JcaPKCS10CertificationRequestBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pfe.back_end.modeles.entites.Utilisateur;

import java.io.File;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.math.BigInteger;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.security.cert.CertificateFactory;
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
                    // Configuration spécifique pour Render (Linux)
                    String pathA = "/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so";
                    String pathB = "/usr/lib/softhsm/libsofthsm2.so";
                    File libFile = new File(pathA);
                    String finalPath = libFile.exists() ? pathA : pathB;

                    configContent.append("library = ").append(finalPath).append("\n");
                    configContent.append("slot = 0\n");
                }

                // Création du fichier de config SunPKCS11 temporaire
                File tempConfig = File.createTempFile("sunpkcs11_config", ".cfg");
                Files.writeString(tempConfig.toPath(), configContent.toString());
                
                // Initialisation du Provider SunPKCS11 (Java 9+)
                Provider p = Security.getProvider("SunPKCS11");
                fournisseurPKCS11 = p.configure(tempConfig.getAbsolutePath());
                Security.addProvider(fournisseurPKCS11);

                System.out.println("✅ HSM initialisé avec succès sur : " + os);
            } catch (Exception e) {
                System.err.println("❌ Échec initialisation HSM : " + e.getMessage());
                throw new RuntimeException("Erreur PKI : " + e.getMessage());
            }
        }
        return fournisseurPKCS11;
    }

    public void genererIdentiteSecurisee(String aliasUtilisateur) throws Exception {
        KeyStore ks = getKeyStore();
        if (!ks.containsAlias(aliasUtilisateur)) {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA", initialiserFournisseur());
            gen.initialize(2048);
            KeyPair paireCles = gen.generateKeyPair();

            X509Certificate certTemporaire = genererCertificatTemporaire(paireCles, aliasUtilisateur);
            ks.setKeyEntry(aliasUtilisateur, paireCles.getPrivate(), null, new Certificate[]{certTemporaire});
            System.out.println("🔐 Clés générées pour : " + aliasUtilisateur);
        }
    }

    private X509Certificate genererCertificatTemporaire(KeyPair kp, String alias) throws Exception {
        long now = System.currentTimeMillis();
        Date start = new Date(now);
        Date expiry = new Date(now + (365L * 24 * 60 * 60 * 1000));

        X500Name dnName = new X500Name("CN=TEMP_" + alias);
        BigInteger serial = new BigInteger(Long.toString(now));

        org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder certBuilder =
                new org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder(
                        dnName, serial, start, expiry, dnName, kp.getPublic());

        ContentSigner signer = new JcaContentSignerBuilder("SHA256withRSA")
                        .setProvider(initialiserFournisseur())
                        .build(kp.getPrivate());

        return new org.bouncycastle.cert.jcajce.JcaX509CertificateConverter()
                .setProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider())
                .getCertificate(certBuilder.build(signer));
    }

    public String creerDemandeCertification(String aliasUtilisateur, Utilisateur utilisateur) throws Exception {
        KeyStore ks = getKeyStore();
        PrivateKey clePrivee = (PrivateKey) ks.getKey(aliasUtilisateur, null);
        PublicKey clePublique = ks.getCertificate(aliasUtilisateur).getPublicKey();

        X500Name nomDistingue = new X500Name("CN=" + utilisateur.getPrenom() + " " + utilisateur.getNom() +
                ", E=" + utilisateur.getEmail() + ", O=TrustSign, C=TN");

        JcaPKCS10CertificationRequestBuilder builder = new JcaPKCS10CertificationRequestBuilder(nomDistingue, clePublique);
        ContentSigner signer = new JcaContentSignerBuilder("SHA256withRSA")
                .setProvider(initialiserFournisseur())
                .build(clePrivee);

        PKCS10CertificationRequest csr = builder.build(signer);
        return "-----BEGIN CERTIFICATE REQUEST-----\n" +
                Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(csr.getEncoded()) +
                "\n-----END CERTIFICATE REQUEST-----";
    }

    public void stockerCertificatFinal(String aliasUtilisateur, String certificatSignePem) throws Exception {
        KeyStore ks = getKeyStore();
        String pemClean = certificatSignePem
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll("\\s", "");
        byte[] certBytes = Base64.getDecoder().decode(pemClean);

        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        X509Certificate vraiCertificat = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));

        PrivateKey privateKey = (PrivateKey) ks.getKey(aliasUtilisateur, null);
        if (privateKey == null) throw new RuntimeException("Clé privée introuvable");

        ks.setKeyEntry(aliasUtilisateur, privateKey, null, new Certificate[]{vraiCertificat});
        System.out.println("✅ Certificat final stocké pour " + aliasUtilisateur);
    }

    public PrivateKey recupererClePrivee(String alias) throws Exception {
        return (PrivateKey) getKeyStore().getKey(alias, null);
    }

    public X509Certificate recupererCertificat(String alias) throws Exception {
        KeyStore ks = getKeyStore();
        Certificate cert = ks.getCertificate(alias);
        return (cert != null) ? (X509Certificate) cert : null;
    }

    private KeyStore getKeyStore() throws Exception {
        Provider p = initialiserFournisseur();
        KeyStore ks = KeyStore.getInstance("PKCS11", p);
        ks.load(null, pinUtilisateur.toCharArray());
        return ks;
    }
}