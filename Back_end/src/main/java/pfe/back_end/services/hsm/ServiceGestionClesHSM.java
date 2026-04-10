package pfe.back_end.services.hsm;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
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

    /**
     * Getter public pour permettre au ServiceSignaturePki d'accéder au provider HSM
     */
    public Provider getFournisseurPKCS11() {
        return initialiserFournisseur();
    }
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
                // IMPORTANT : Sur Render, on utilise la lib installée mais NOTRE config
                configContent.append("library = /usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so\n");
                configContent.append("slotListIndex = 0\n");
            }

            File tempConfig = File.createTempFile("sunpkcs11", ".cfg");
            Files.writeString(tempConfig.toPath(), configContent.toString());
            
            Provider p = Security.getProvider("SunPKCS11");
            fournisseurPKCS11 = p.configure(tempConfig.getAbsolutePath());
            
            // On vérifie si déjà présent pour éviter les doublons
            if (Security.getProvider(fournisseurPKCS11.getName()) != null) {
                Security.removeProvider(fournisseurPKCS11.getName());
            }
            Security.addProvider(fournisseurPKCS11);

            System.out.println("✅ HSM initialisé avec succès");
        } catch (Exception e) {
            // Loggez l'erreur complète pour la voir dans Render
            e.printStackTrace(); 
            throw new RuntimeException("Erreur PKCS11 : " + e.getMessage());
        }
    }
    return fournisseurPKCS11;
}

    public void genererIdentiteSecurisee(String aliasUtilisateur) throws Exception {
        KeyStore ks = getKeyStore();
        if (!ks.containsAlias(aliasUtilisateur)) {
            // Génération de la paire de clés RSA 2048 directement DANS le HSM
            KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA", initialiserFournisseur());
            gen.initialize(2048);
            KeyPair paireCles = gen.generateKeyPair();

            // Création d'un certificat auto-signé temporaire pour l'initialisation du KeyStore
            X509Certificate certTemporaire = genererCertificatTemporaire(paireCles, aliasUtilisateur);
            
            // Stockage de la clé et du certificat dans le HSM
            ks.setKeyEntry(aliasUtilisateur, paireCles.getPrivate(), null, new Certificate[]{certTemporaire});
            System.out.println("🔐 Paire de clés et certificat temporaire générés dans le HSM : " + aliasUtilisateur);
        }
    }

    private X509Certificate genererCertificatTemporaire(KeyPair kp, String alias) throws Exception {
        long now = System.currentTimeMillis();
        X500Name dnName = new X500Name("CN=TEMP_" + alias);
        
        org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder certBuilder =
                new org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder(
                        dnName, 
                        new BigInteger(Long.toString(now)), 
                        new Date(now), 
                        new Date(now + 31536000000L), // 1 an
                        dnName, 
                        kp.getPublic());

        // La signature du certificat se fait via le HSM
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

        X500Name subject = new X500Name("CN=" + utilisateur.getPrenom() + " " + utilisateur.getNom() +
                ", E=" + utilisateur.getEmail() + ", O=TrustSign, C=TN");

        JcaPKCS10CertificationRequestBuilder builder = new JcaPKCS10CertificationRequestBuilder(subject, clePublique);
        
        // La CSR est signée par la clé privée qui reste dans le HSM
        ContentSigner signer = new JcaContentSignerBuilder("SHA256withRSA")
                .setProvider(initialiserFournisseur())
                .build(clePrivee);

        return "-----BEGIN CERTIFICATE REQUEST-----\n" +
                Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(builder.build(signer).getEncoded()) +
                "\n-----END CERTIFICATE REQUEST-----";
    }

    public void stockerCertificatFinal(String aliasUtilisateur, String certificatSignePem) throws Exception {
        KeyStore ks = getKeyStore();
        String cleanPem = certificatSignePem.replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "").replaceAll("\\s", "");
        
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        X509Certificate cert = (X509Certificate) cf.generateCertificate(
                new ByteArrayInputStream(Base64.getDecoder().decode(cleanPem)));

        // Remplacement du certificat temporaire par le certificat signé par l'AC
        PrivateKey pk = (PrivateKey) ks.getKey(aliasUtilisateur, null);
        ks.setKeyEntry(aliasUtilisateur, pk, null, new Certificate[]{cert});
        System.out.println("✅ Certificat final validé et stocké dans le HSM pour l'alias : " + aliasUtilisateur);
    }

    public PrivateKey recupererClePrivee(String alias) throws Exception {
        return (PrivateKey) getKeyStore().getKey(alias, null);
    }

    public X509Certificate recupererCertificat(String alias) throws Exception {
        Certificate cert = getKeyStore().getCertificate(alias);
        return (cert instanceof X509Certificate) ? (X509Certificate) cert : null;
    }

    private KeyStore getKeyStore() throws Exception {
        Provider p = initialiserFournisseur();
        // Spécification explicite du type PKCS11
        KeyStore ks = KeyStore.getInstance("PKCS11", p);
        // Chargement du KeyStore avec le PIN utilisateur SoftHSM2
        ks.load(null, pinUtilisateur.toCharArray());
        return ks;
    }
}