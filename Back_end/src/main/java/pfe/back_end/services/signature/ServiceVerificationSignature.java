package pfe.back_end.services.signature;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.signatures.PdfPKCS7;
import com.itextpdf.signatures.SignatureUtil;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.security.cert.CertificateExpiredException;
import java.security.cert.CertificateNotYetValidException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

@Service
public class ServiceVerificationSignature {

    public VerificationSignatureResult verifierSignaturePdf(byte[] pdfBytes) throws Exception {
        VerificationSignatureResult result = new VerificationSignatureResult();
        List<SignatureVerification> verifications = new ArrayList<>();

        try (ByteArrayInputStream bais = new ByteArrayInputStream(pdfBytes);
             PdfDocument pdfDoc = new PdfDocument(new PdfReader(bais))) {

            SignatureUtil signatureUtil = new SignatureUtil(pdfDoc);
            List<String> signatureNames = signatureUtil.getSignatureNames();

            for (String name : signatureNames) {
                SignatureVerification verification = new SignatureVerification();
                verification.setNomSignataire(name);

                try {
                    PdfPKCS7 pkcs7 = signatureUtil.readSignatureData(name);

                    if (pkcs7 != null) {
                        X509Certificate cert = pkcs7.getSigningCertificate();

                        boolean certificatValide = false;
                        String certificatStatut = "";
                        Date certificatExpiration = null;

                        if (cert != null) {
                            try {
                                cert.checkValidity();
                                certificatValide = true;
                                certificatStatut = "Valide";
                                certificatExpiration = cert.getNotAfter();
                            } catch (CertificateExpiredException e) {
                                certificatValide = false;
                                certificatStatut = "EXPIRÉ - Certificat expiré le " + cert.getNotAfter();
                                certificatExpiration = cert.getNotAfter();
                            } catch (CertificateNotYetValidException e) {
                                certificatValide = false;
                                certificatStatut = "Certificat pas encore valide";
                                certificatExpiration = cert.getNotAfter();
                            }

                            verification.setCertificatValide(certificatValide);
                            verification.setCertificatStatut(certificatStatut);
                            verification.setCertificatExpiration(certificatExpiration);
                            verification.setNomSignataire(extractNameFromDN(cert.getSubjectX500Principal().getName()));
                            verification.setCertificatSujet(cert.getSubjectX500Principal().getName());
                            verification.setCertificatEmetteur(cert.getIssuerX500Principal().getName());
                        }

                        boolean integrale = pkcs7.verifySignatureIntegrityAndAuthenticity();
                        verification.setIntegriteValide(integrale && certificatValide);

                        // Récupérer la date de signature
                        Calendar signCalendar = pkcs7.getSignDate();
                        if (signCalendar != null) {
                            verification.setDateSignature(signCalendar.getTime());
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Erreur vérification signature '" + name + "': " + e.getMessage());
                    verification.setIntegriteValide(false);
                }
                verifications.add(verification);
            }

            // Si aucune signature trouvée
            if (signatureNames.isEmpty()) {
                SignatureVerification defaultVerif = new SignatureVerification();
                defaultVerif.setNomSignataire("Aucune signature trouvée");
                defaultVerif.setIntegriteValide(false);
                verifications.add(defaultVerif);
            }

            result.setSignatures(verifications);
            result.setDocumentIntegre(!verifications.isEmpty() &&
                    verifications.stream().allMatch(v -> v.isIntegriteValide()));

        }
        return result;
    }

    private String extractNameFromDN(String dn) {
        String[] parts = dn.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.startsWith("CN=")) {
                return trimmed.substring(3);
            }
        }
        return dn;
    }

    // Classes internes
    public static class VerificationSignatureResult {
        private boolean documentIntegre;
        private List<SignatureVerification> signatures = new ArrayList<>();

        public boolean isDocumentIntegre() { return documentIntegre; }
        public void setDocumentIntegre(boolean documentIntegre) { this.documentIntegre = documentIntegre; }
        public List<SignatureVerification> getSignatures() { return signatures; }
        public void setSignatures(List<SignatureVerification> signatures) { this.signatures = signatures; }
    }

    public static class SignatureVerification {
        private String nomSignataire;
        private Date dateSignature;
        private String raison;
        private String localisation;
        private boolean integriteValide;
        private String certificatSujet;
        private String certificatEmetteur;
        private boolean certificatValide;
        private boolean chaineConfianceValide;
        private String certificatStatut;
        private Date certificatExpiration;

        // Getters
        public String getNomSignataire() { return nomSignataire; }
        public Date getDateSignature() { return dateSignature; }
        public String getRaison() { return raison; }
        public String getLocalisation() { return localisation; }
        public boolean isIntegriteValide() { return integriteValide; }
        public String getCertificatSujet() { return certificatSujet; }
        public String getCertificatEmetteur() { return certificatEmetteur; }
        public boolean isCertificatValide() { return certificatValide; }
        public boolean isChaineConfianceValide() { return chaineConfianceValide; }
        public String getCertificatStatut() { return certificatStatut; }
        public Date getCertificatExpiration() { return certificatExpiration; }

        // Setters
        public void setNomSignataire(String nomSignataire) { this.nomSignataire = nomSignataire; }
        public void setDateSignature(Date dateSignature) { this.dateSignature = dateSignature; }
        public void setRaison(String raison) { this.raison = raison; }
        public void setLocalisation(String localisation) { this.localisation = localisation; }
        public void setIntegriteValide(boolean integriteValide) { this.integriteValide = integriteValide; }
        public void setCertificatSujet(String certificatSujet) { this.certificatSujet = certificatSujet; }
        public void setCertificatEmetteur(String certificatEmetteur) { this.certificatEmetteur = certificatEmetteur; }
        public void setCertificatValide(boolean certificatValide) { this.certificatValide = certificatValide; }
        public void setChaineConfianceValide(boolean chaineConfianceValide) { this.chaineConfianceValide = chaineConfianceValide; }
        public void setCertificatStatut(String certificatStatut) { this.certificatStatut = certificatStatut; }
        public void setCertificatExpiration(Date certificatExpiration) { this.certificatExpiration = certificatExpiration; }
    }
}