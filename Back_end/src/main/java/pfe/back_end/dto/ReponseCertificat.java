package pfe.back_end.dto;

public class ReponseCertificat {
    private String subjectName;
    private String email;
    private String notBefore;
    private String notAfter;
    private String serialNumber;
    private String algorithme;

    // Constructeurs
    public ReponseCertificat() {}

    public ReponseCertificat(String subjectName, String email, String notBefore, String notAfter, 
                             String serialNumber, String algorithme) {
        this.subjectName = subjectName;
        this.email = email;
        this.notBefore = notBefore;
        this.notAfter = notAfter;
        this.serialNumber = serialNumber;
        this.algorithme = algorithme;
    }

    // Getters et Setters
    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getNotBefore() { return notBefore; }
    public void setNotBefore(String notBefore) { this.notBefore = notBefore; }
    
    public String getNotAfter() { return notAfter; }
    public void setNotAfter(String notAfter) { this.notAfter = notAfter; }
    
    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }
    
    public String getAlgorithme() { return algorithme; }
    public void setAlgorithme(String algorithme) { this.algorithme = algorithme; }
    
    // Builder manuel
    public static ReponseCertificatBuilder builder() {
        return new ReponseCertificatBuilder();
    }
    
    public static class ReponseCertificatBuilder {
        private String subjectName;
        private String email;
        private String notBefore;
        private String notAfter;
        private String serialNumber;
        private String algorithme;
        
        public ReponseCertificatBuilder subjectName(String subjectName) { this.subjectName = subjectName; return this; }
        public ReponseCertificatBuilder email(String email) { this.email = email; return this; }
        public ReponseCertificatBuilder notBefore(String notBefore) { this.notBefore = notBefore; return this; }
        public ReponseCertificatBuilder notAfter(String notAfter) { this.notAfter = notAfter; return this; }
        public ReponseCertificatBuilder serialNumber(String serialNumber) { this.serialNumber = serialNumber; return this; }
        public ReponseCertificatBuilder algorithme(String algorithme) { this.algorithme = algorithme; return this; }
        
        public ReponseCertificat build() {
            return new ReponseCertificat(subjectName, email, notBefore, notAfter, serialNumber, algorithme);
        }
    }
}