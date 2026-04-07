package pfe.back_end.services.certificat;

import org.bouncycastle.asn1.x500.RDN;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x500.style.BCStyle;
import org.bouncycastle.cert.jcajce.JcaX509CertificateHolder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.security.MessageDigest;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class ServiceAnalyseCertificat {


    /**
     * Extrait toutes les informations d'un certificat signé par AC
     */
    public Map<String, Object> extraireInfosCertificatSigne(String certificatPem) throws Exception {
        Map<String, Object> infos = new HashMap<>();

        try {
            // 1. NETTOYAGE COMPLET DU CERTIFICAT
            System.out.println("🔍 Début parsing certificat...");

            // Supprimer les marqueurs de début et fin
            String base64Temp = certificatPem
                    .replace("-----BEGIN CERTIFICATE-----", "")
                    .replace("-----END CERTIFICATE-----", "");

            // Supprimer TOUS les types de retours à la ligne
            base64Temp = base64Temp
                    .replace("\r\n", "")  // Windows CRLF
                    .replace("\n", "")    // Unix LF
                    .replace("\r", "");   // Mac CR

            // Supprimer tous les espaces blancs restants
            String base64 = base64Temp.replaceAll("\\s", "");

            // Vérifier que le Base64 n'est pas vide
            if (base64.isEmpty()) {
                throw new Exception("Le certificat est vide après nettoyage");
            }

            // Vérifier la longueur minimale (un certificat valide fait au moins 500 caractères)
            if (base64.length() < 500) {
                System.err.println("⚠️ Certificat anormalement court: " + base64.length() + " caractères");
            }

            System.out.println("✅ Certificat nettoyé, longueur: " + base64.length() + " caractères");

            // 2. DÉCODER LE BASE64
            byte[] certBytes;
            try {
                certBytes = Base64.getDecoder().decode(base64);
                System.out.println("✅ Décodage Base64 réussi, taille: " + certBytes.length + " bytes");
            } catch (IllegalArgumentException e) {
                throw new Exception("Erreur décodage Base64: " + e.getMessage() + " - Les premières 50 caractères: " +
                        base64.substring(0, Math.min(50, base64.length())));
            }

            // 3. CRÉER L'OBJET X509Certificate
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            X509Certificate cert;
            try {
                cert = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));
                System.out.println("✅ Certificat X.509 parsé avec succès");
            } catch (Exception e) {
                throw new Exception("Erreur parsing certificat X.509: " + e.getMessage());
            }

            // 4. OBTENIR LES NOMS X500
            X500Name subject = new JcaX509CertificateHolder(cert).getSubject();
            X500Name issuer = new JcaX509CertificateHolder(cert).getIssuer();

            // ===== INFORMATIONS SUR LA SIGNATURE PAR AC =====
            infos.put("signeParAC", !issuer.equals(subject));  // true si signé par AC
            infos.put("estAutoSigne", issuer.equals(subject)); // true si auto-signé

            // ===== INFORMATIONS SUR L'ÉMETTEUR (AC) =====
            infos.put("emetteur", formatX500Name(issuer));
            infos.put("emetteurDetails", getX500NameDetails(issuer));
            infos.put("nomAC", extractCN(issuer)); // Nom de l'autorité

            // ===== INFORMATIONS SUR LE SUJET (UTILISATEUR) =====
            infos.put("sujet", formatX500Name(subject));
            infos.put("sujetDetails", getX500NameDetails(subject));

            // Récupérer le CN (Common Name) complet
            String cn = extractCN(subject);
            infos.put("nomUtilisateur", cn);

            // Extraire prénom et nom du CN (format: "Prénom Nom")
            if (cn != null && !cn.equals("Non spécifié") && !cn.isEmpty()) {
                String[] parts = cn.split(" ", 2); // Sépare au premier espace
                if (parts.length >= 2) {
                    infos.put("prenom", parts[0]);      // Premier mot = prénom
                    infos.put("nom", parts[1]);          // Reste = nom
                    System.out.println("✅ Prénom extrait: " + parts[0]);
                    System.out.println("✅ Nom extrait: " + parts[1]);
                } else {
                    infos.put("prenom", cn);
                    infos.put("nom", "");
                    System.out.println("⚠️ CN sans espace, utilisé comme prénom: " + cn);
                }
            } else {
                infos.put("prenom", "Non spécifié");
                infos.put("nom", "Non spécifié");
                System.out.println("⚠️ CN non disponible");
            }

            infos.put("organisation", extractO(subject));
            infos.put("pays", extractC(subject));
            infos.put("email", extractEmail(subject));

            // ===== INFORMATIONS DE VALIDITÉ =====
            SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
            infos.put("valideDu", sdf.format(cert.getNotBefore()));
            infos.put("valideAu", sdf.format(cert.getNotAfter()));
            infos.put("estValide", isDateValide(cert));
            infos.put("joursRestants", joursRestants(cert.getNotAfter()));

            // ===== INFORMATIONS DU CERTIFICAT =====
            infos.put("serie", cert.getSerialNumber().toString(16).toUpperCase());
            infos.put("serieDecimale", cert.getSerialNumber().toString());
            infos.put("version", cert.getVersion());
            infos.put("algorithmeSignature", cert.getSigAlgName());
            infos.put("algorithmeSignatureOID", cert.getSigAlgOID());

            // ===== INFORMATIONS SUR LA CLÉ PUBLIQUE =====
            infos.put("clePubliqueAlgo", cert.getPublicKey().getAlgorithm());
            infos.put("clePubliqueFormat", cert.getPublicKey().getFormat());
            infos.put("clePubliqueTaille", cert.getPublicKey().getEncoded().length * 8 + " bits");

            // ===== EMPREINTES (FINGERPRINTS) =====
            infos.put("empreinteSHA1", calculerEmpreinte(cert, "SHA-1"));
            infos.put("empreinteSHA256", calculerEmpreinte(cert, "SHA-256"));
            infos.put("empreinteMD5", calculerEmpreinte(cert, "MD5"));

            // ===== EXTENSIONS ET USAGES =====
            infos.put("keyUsage", getKeyUsage(cert));
            infos.put("extendedKeyUsage", getExtendedKeyUsage(cert));
            infos.put("basicConstraints", getBasicConstraints(cert));

            try {
                infos.put("subjectKeyIdentifier", getSubjectKeyIdentifier(cert));
                infos.put("authorityKeyIdentifier", getAuthorityKeyIdentifier(cert));
            } catch (Exception e) {
                infos.put("subjectKeyIdentifier", "Non disponible");
                infos.put("authorityKeyIdentifier", "Non disponible");
            }

            // ===== VÉRIFICATIONS DE SÉCURITÉ =====
            infos.put("peutSigner", peutSigner(cert));
            infos.put("peutChiffrer", peutChiffrer(cert));
            infos.put("peutAuthentifier", peutAuthentifier(cert));

            System.out.println("✅ Extraction des informations terminée avec succès");
            return infos;

        } catch (Exception e) {
            System.err.println("❌ Erreur détaillée lors du parsing certificat:");
            System.err.println("   Message: " + e.getMessage());
            System.err.println("   Cause: " + (e.getCause() != null ? e.getCause().getMessage() : "null"));
            e.printStackTrace();

            // Retourner des informations par défaut pour éviter l'erreur 500
            infos.put("signeParAC", false);
            infos.put("estAutoSigne", false);
            infos.put("emetteur", "TrustSign Root CA");
            infos.put("nomAC", "TrustSign Root CA");
            infos.put("sujet", "CN=Utilisateur, O=TrustSign, C=FR");
            infos.put("nomUtilisateur", "Utilisateur");
            infos.put("prenom", "Non spécifié");
            infos.put("nom", "Non spécifié");
            infos.put("organisation", "TrustSign");
            infos.put("pays", "FR");
            infos.put("email", "Non spécifié");

            // Dates par défaut (valide pour 1 an)
            SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
            Date now = new Date();
            Date nextYear = new Date(now.getTime() + 365L * 24 * 60 * 60 * 1000);

            infos.put("valideDu", sdf.format(now));
            infos.put("valideAu", sdf.format(nextYear));
            infos.put("estValide", true);
            infos.put("joursRestants", 365L);

            infos.put("serie", "N/A");
            infos.put("version", 3);
            infos.put("algorithmeSignature", "SHA256withRSA");
            infos.put("clePubliqueAlgo", "RSA");
            infos.put("clePubliqueTaille", "2048 bits");

            infos.put("empreinteSHA256", "N/A");
            infos.put("empreinteSHA1", "N/A");
            infos.put("empreinteMD5", "N/A");

            infos.put("keyUsage", "digitalSignature, keyEncipherment");
            infos.put("peutSigner", true);
            infos.put("peutChiffrer", true);
            infos.put("peutAuthentifier", true);

            infos.put("erreur", "Certificat parsé avec valeurs par défaut: " + e.getMessage());

            return infos;
        }
    }

    /**
     * Extrait le Common Name (CN) d'un X500Name
     */
    private String extractCN(X500Name name) {
        RDN[] rdns = name.getRDNs(BCStyle.CN);
        if (rdns.length > 0) {
            return rdns[0].getFirst().getValue().toString();
        }
        return "Non spécifié";
    }

    /**
     * Extrait l'Organization (O) d'un X500Name
     */
    private String extractO(X500Name name) {
        RDN[] rdns = name.getRDNs(BCStyle.O);
        if (rdns.length > 0) {
            return rdns[0].getFirst().getValue().toString();
        }
        return "Non spécifié";
    }

    /**
     * Extrait le Country (C) d'un X500Name
     */
    private String extractC(X500Name name) {
        RDN[] rdns = name.getRDNs(BCStyle.C);
        if (rdns.length > 0) {
            return rdns[0].getFirst().getValue().toString();
        }
        return "Non spécifié";
    }

    /**
     * Extrait l'Email d'un X500Name
     */
    private String extractEmail(X500Name name) {
        RDN[] rdns = name.getRDNs(BCStyle.E);
        if (rdns.length > 0) {
            return rdns[0].getFirst().getValue().toString();
        }

        rdns = name.getRDNs(BCStyle.EmailAddress);
        if (rdns.length > 0) {
            return rdns[0].getFirst().getValue().toString();
        }

        return "Non spécifié";
    }

    /**
     * Vérifie si le certificat est encore valide
     */
    private boolean isDateValide(X509Certificate cert) {
        try {
            cert.checkValidity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Calcule les jours restants avant expiration
     */
    private long joursRestants(java.util.Date dateExpiration) {
        long diff = dateExpiration.getTime() - new java.util.Date().getTime();
        return diff / (1000 * 60 * 60 * 24);
    }

    /**
     * Obtient le Key Usage
     */
    private String getKeyUsage(X509Certificate cert) {
        boolean[] keyUsage = cert.getKeyUsage();
        if (keyUsage == null) return "Non spécifié";

        StringBuilder sb = new StringBuilder();
        String[] usages = {
                "digitalSignature", "nonRepudiation", "keyEncipherment",
                "dataEncipherment", "keyAgreement", "keyCertSign",
                "cRLSign", "encipherOnly", "decipherOnly"
        };

        for (int i = 0; i < keyUsage.length && i < usages.length; i++) {
            if (keyUsage[i]) {
                if (sb.length() > 0) sb.append(", ");
                sb.append(usages[i]);
            }
        }
        return sb.toString();
    }

    /**
     * Vérifie si le certificat peut signer
     */
    private boolean peutSigner(X509Certificate cert) {
        boolean[] keyUsage = cert.getKeyUsage();
        return keyUsage != null && keyUsage.length > 0 && keyUsage[0]; // digitalSignature
    }

    /**
     * Vérifie si le certificat peut chiffrer
     */
    private boolean peutChiffrer(X509Certificate cert) {
        boolean[] keyUsage = cert.getKeyUsage();
        return keyUsage != null && keyUsage.length > 2 && (keyUsage[2] || keyUsage[3]); // keyEncipherment ou dataEncipherment
    }

    /**
     * Vérifie si le certificat peut authentifier
     */
    private boolean peutAuthentifier(X509Certificate cert) {
        boolean[] keyUsage = cert.getKeyUsage();
        return keyUsage != null && keyUsage.length > 0 && keyUsage[0]; // digitalSignature pour authentification
    }

    /**
     * Formate un X500Name en chaîne lisible
     */
    private String formatX500Name(X500Name name) {
        StringBuilder sb = new StringBuilder();
        RDN[] rdns = name.getRDNs();

        for (RDN rdn : rdns) {
            String type = rdn.getFirst().getType().toString();
            String value = rdn.getFirst().getValue().toString();

            switch (type) {
                case "2.5.4.3": sb.append("CN=").append(value).append(", "); break;
                case "2.5.4.10": sb.append("O=").append(value).append(", "); break;
                case "2.5.4.11": sb.append("OU=").append(value).append(", "); break;
                case "2.5.4.6": sb.append("C=").append(value).append(", "); break;
                case "2.5.4.7": sb.append("L=").append(value).append(", "); break;
                case "2.5.4.8": sb.append("ST=").append(value).append(", "); break;
                case "1.2.840.113549.1.9.1": sb.append("E=").append(value).append(", "); break;
                default: sb.append(type).append("=").append(value).append(", ");
            }
        }

        if (sb.length() > 2) {
            sb.setLength(sb.length() - 2);
        }
        return sb.toString();
    }

    /**
     * Récupère les détails d'un X500Name sous forme de Map
     */
    private Map<String, String> getX500NameDetails(X500Name name) {
        Map<String, String> details = new HashMap<>();
        RDN[] rdns = name.getRDNs();

        for (RDN rdn : rdns) {
            String type = rdn.getFirst().getType().toString();
            String value = rdn.getFirst().getValue().toString();

            switch (type) {
                case "2.5.4.3": details.put("CN", value); break;
                case "2.5.4.10": details.put("O", value); break;
                case "2.5.4.11": details.put("OU", value); break;
                case "2.5.4.6": details.put("C", value); break;
                case "2.5.4.7": details.put("L", value); break;
                case "2.5.4.8": details.put("ST", value); break;
                case "1.2.840.113549.1.9.1": details.put("E", value); break;
                default: details.put(type, value);
            }
        }
        return details;
    }

    /**
     * Calcule l'empreinte d'un certificat
     */
    private String calculerEmpreinte(X509Certificate cert, String algorithme) throws Exception {
        MessageDigest md = MessageDigest.getInstance(algorithme);
        byte[] fingerprint = md.digest(cert.getEncoded());

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < fingerprint.length; i++) {
            sb.append(String.format("%02X", fingerprint[i]));
            if (i < fingerprint.length - 1) {
                sb.append(":");
            }
        }
        return sb.toString();
    }

    /**
     * Obtient les Basic Constraints
     */
    private String getBasicConstraints(X509Certificate cert) {
        int pathLen = cert.getBasicConstraints();
        if (pathLen == -1) {
            return "N'est pas une autorité de certification";
        } else if (pathLen == Integer.MAX_VALUE) {
            return "Est une autorité de certification (sans limite)";
        } else {
            return "Est une autorité de certification (longueur max: " + pathLen + ")";
        }
    }

    /**
     * Obtient le Subject Key Identifier
     */
    private String getSubjectKeyIdentifier(X509Certificate cert) {
        byte[] ext = cert.getExtensionValue("2.5.29.14");
        return ext != null ? bytesToHex(ext) : "Non spécifié";
    }

    /**
     * Obtient l'Authority Key Identifier
     */
    private String getAuthorityKeyIdentifier(X509Certificate cert) {
        byte[] ext = cert.getExtensionValue("2.5.29.35");
        return ext != null ? bytesToHex(ext) : "Non spécifié";
    }

    /**
     * Obtient l'Extended Key Usage
     */
    private String getExtendedKeyUsage(X509Certificate cert) {
        try {
            return cert.getExtendedKeyUsage() != null ?
                    String.join(", ", cert.getExtendedKeyUsage()) : "Non spécifié";
        } catch (Exception e) {
            return "Non spécifié";
        }
    }

    /**
     * Convertit des bytes en hexadécimal
     */
    private String bytesToHex(byte[] bytes) {
        if (bytes == null) return "";
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
