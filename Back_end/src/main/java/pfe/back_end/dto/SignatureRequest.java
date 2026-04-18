package pfe.back_end.dto;

public class SignatureRequest {
    private Long documentId;
    private String token;
    private String otp;
    private String nom;
    private String prenom;
    private String telephone;
    private String emailDestinataire;
    private float x;
    private float y;
    private int pageNumber;
    private float displayWidth;
    private float displayHeight;
    private String signatureImage;
    private String typeSignature;

    // Constructeurs
    public SignatureRequest() {}

    public SignatureRequest(Long documentId, String token, String otp, String nom, String prenom,
                            String telephone, String emailDestinataire, float x, float y, int pageNumber,
                            float displayWidth, float displayHeight, String signatureImage, String typeSignature) {
        this.documentId = documentId;
        this.token = token;
        this.otp = otp;
        this.nom = nom;
        this.prenom = prenom;
        this.telephone = telephone;
        this.emailDestinataire = emailDestinataire;
        this.x = x;
        this.y = y;
        this.pageNumber = pageNumber;
        this.displayWidth = displayWidth;
        this.displayHeight = displayHeight;
        this.signatureImage = signatureImage;
        this.typeSignature = typeSignature;
    }

    // Getters et Setters
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
    
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    
    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    
    public String getEmailDestinataire() { return emailDestinataire; }
    public void setEmailDestinataire(String emailDestinataire) { this.emailDestinataire = emailDestinataire; }
    
    public float getX() { return x; }
    public void setX(float x) { this.x = x; }
    
    public float getY() { return y; }
    public void setY(float y) { this.y = y; }
    
    public int getPageNumber() { return pageNumber; }
    public void setPageNumber(int pageNumber) { this.pageNumber = pageNumber; }
    
    public float getDisplayWidth() { return displayWidth; }
    public void setDisplayWidth(float displayWidth) { this.displayWidth = displayWidth; }
    
    public float getDisplayHeight() { return displayHeight; }
    public void setDisplayHeight(float displayHeight) { this.displayHeight = displayHeight; }
    
    public String getSignatureImage() { return signatureImage; }
    public void setSignatureImage(String signatureImage) { this.signatureImage = signatureImage; }
    
    public String getTypeSignature() { return typeSignature; }
    public void setTypeSignature(String typeSignature) { this.typeSignature = typeSignature; }
}