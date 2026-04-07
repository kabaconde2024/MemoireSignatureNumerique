package pfe.back_end.services.timestamp;

import jakarta.annotation.PostConstruct;
import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.SignerInformationVerifier;
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoVerifierBuilder;
import org.bouncycastle.tsp.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import pfe.back_end.modeles.entites.Document;
import pfe.back_end.repositories.sql.DocumentRepository;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URI;
import java.security.MessageDigest;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class ServiceHorodatage {

    private static final Logger logger = LoggerFactory.getLogger(ServiceHorodatage.class);

    @Value("${tsa.url:https://freetsa.org/tsr}")
    private String tsaUrl;

    @Value("${tsa.enabled:true}")
    private boolean tsaEnabled;

    @Value("${tsa.certificate.path:classpath:tsa.crt}")
    private String tsaCertPath;

    @Value("${tsa.ca-certificate.path:classpath:cacert.pem}")
    private String caCertPath;

    private X509Certificate tsaCertificate;
    private SignerInformationVerifier verifier;
    private static final String SHA256_OID = "2.16.840.1.101.3.4.2.1";

    @Autowired
    private DocumentRepository documentRepository;

    // ✅ Ajouter cette méthode pour ignorer les erreurs SSL (développement uniquement)
    private void trustAllCertificates() {
        try {
            TrustManager[] trustAllCerts = new TrustManager[]{
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() { return null; }
                        public void checkClientTrusted(X509Certificate[] certs, String authType) {}
                        public void checkServerTrusted(X509Certificate[] certs, String authType) {}
                    }
            };
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
            logger.info("✅ SSL ignore activé pour les tests TSA");
        } catch (Exception e) {
            logger.warn("Impossible d'ignorer SSL: {}", e.getMessage());
        }
    }

    @PostConstruct
    public void init() {
        // ✅ Activer l'ignorance SSL au démarrage (pour développement)
        trustAllCertificates();

        if (!tsaEnabled) return;
        try {
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            try (InputStream is = new ClassPathResource(tsaCertPath.replace("classpath:", "")).getInputStream()) {
                tsaCertificate = (X509Certificate) cf.generateCertificate(is);
            }
            verifier = new JcaSimpleSignerInfoVerifierBuilder().setProvider("BC").build(tsaCertificate);
            logger.info("✅ Service Horodatage initialisé (TSA: {})", tsaUrl);

            // ✅ Tester la connexion au démarrage
            boolean connected = testConnexion();
            logger.info("Test connexion TSA: {}", connected ? "✅ CONNECTÉ" : "❌ DÉCONNECTÉ");

        } catch (Exception e) {
            logger.error("❌ Erreur initialisation TSA : {}", e.getMessage());
            e.printStackTrace();
        }
    }

    public byte[] getTimestamp(byte[] documentHash) {
        if (!tsaEnabled) return null;
        try {
            TimeStampRequestGenerator reqGen = new TimeStampRequestGenerator();
            reqGen.setCertReq(true);
            TimeStampRequest request = reqGen.generate(new ASN1ObjectIdentifier(SHA256_OID), documentHash, BigInteger.valueOf(System.currentTimeMillis()));

            HttpURLConnection conn = (HttpURLConnection) URI.create(tsaUrl).toURL().openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/timestamp-query");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(request.getEncoded());
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            logger.info("Réponse TSA: HTTP {}", responseCode);

            if (responseCode != 200) {
                throw new RuntimeException("Erreur HTTP TSA: " + responseCode);
            }

            TimeStampResponse response = new TimeStampResponse(conn.getInputStream().readAllBytes());
            response.validate(request);
            TimeStampToken token = response.getTimeStampToken();
            if (verifier != null) {
                token.validate(verifier);
            }

            logger.info("✅ Horodatage réussi");
            return token.getEncoded();

        } catch (Exception e) {
            logger.error("❌ Échec horodatage : {}", e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    public String horodaterDocument(Long documentId, byte[] documentSigne, String typeSignature) {
        if (!tsaEnabled) {
            logger.warn("TSA désactivé - Pas d'horodatage pour document ID: {}", documentId);
            return null;
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashDocument = digest.digest(documentSigne);
            byte[] token = getTimestamp(hashDocument);

            if (token != null) {
                String tokenBase64 = jetonEnBase64(token);

                if (documentId != null && documentRepository != null) {
                    Optional<Document> optDoc = documentRepository.findById(documentId);
                    if (optDoc.isPresent()) {
                        Document doc = optDoc.get();
                        doc.setJetonTimestamp(tokenBase64);
                        doc.setDateHorodatage(LocalDateTime.now());
                        documentRepository.save(doc);
                        logger.info("✅ Horodatage sauvegardé pour document ID: {} - Type: {}", documentId, typeSignature);
                    } else {
                        logger.warn("Document non trouvé pour l'horodatage - ID: {}", documentId);
                    }
                }

                return tokenBase64;
            }
        } catch (Exception e) {
            logger.error("❌ Erreur lors de l'horodatage: {}", e.getMessage());
        }

        return null;
    }

    public boolean validerToken(byte[] token, byte[] documentHashOriginal) {
        try {
            TimeStampToken timestampToken = new TimeStampToken(new CMSSignedData(token));
            TimeStampTokenInfo info = timestampToken.getTimeStampInfo();

            byte[] hashHorodate = info.getMessageImprintDigest();
            if (!MessageDigest.isEqual(documentHashOriginal, hashHorodate)) {
                logger.warn("Hash du document ne correspond pas à celui horodaté");
                return false;
            }

            if (verifier != null) {
                timestampToken.validate(verifier);
            }

            logger.info("✅ Token horodaté valide - Date: {}", info.getGenTime());
            return true;

        } catch (Exception e) {
            logger.error("❌ Validation échouée: {}", e.getMessage());
            return false;
        }
    }

    public Map<String, Object> getInfosToken(String tokenBase64) {
        Map<String, Object> infos = new HashMap<>();
        try {
            byte[] token = jetonDepuisBase64(tokenBase64);
            TimeStampToken timestampToken = new TimeStampToken(new CMSSignedData(token));
            TimeStampTokenInfo info = timestampToken.getTimeStampInfo();

            infos.put("date", info.getGenTime());
            infos.put("hashAlgo", info.getMessageImprintAlgOID().getId());
            infos.put("serialNumber", info.getSerialNumber());
            infos.put("tsaName", info.getTsa() != null ? info.getTsa().toString() : "Inconnu");
            infos.put("policy", info.getPolicy());
            infos.put("valide", true);

        } catch (Exception e) {
            infos.put("valide", false);
            infos.put("erreur", e.getMessage());
        }
        return infos;
    }

    public String jetonEnBase64(byte[] token) {
        return Base64.getEncoder().encodeToString(token);
    }

    public byte[] jetonDepuisBase64(String base64) {
        return Base64.getDecoder().decode(base64);
    }

    public boolean isEnabled() {
        return tsaEnabled;
    }
// Dans ServiceHorodatage.java - Remplacer la méthode testConnexion()
// Dans ServiceHorodatage.java - Remplacer testConnexion()

    public boolean testConnexion() {
        try {
            // Créer un petit hash de test
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] testHash = digest.digest("test_connection".getBytes());

            // Essayer d'obtenir un timestamp
            byte[] token = getTimestamp(testHash);

            if (token != null && token.length > 0) {
                logger.info("✅ Test connexion TSA: RÉUSSI");
                return true;
            } else {
                logger.warn("⚠️ Test connexion TSA: ÉCHEC - token null");
                return false;
            }
        } catch (Exception e) {
            logger.error("❌ Test connexion TSA: ÉCHEC - {}", e.getMessage());
            return false;
        }
    }


    public boolean areCertificatesLoaded() {
        return tsaCertificate != null;
    }

    public String getTsaUrl() {
        return tsaUrl;
    }
}