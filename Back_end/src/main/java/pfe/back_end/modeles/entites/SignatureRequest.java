package pfe.back_end.modeles.entites;

public class SignatureRequest {
    private String token;
    private String otp;
    private String nom;
    private String telephone;
    private String emailDestinataire;
    private int x;
    private int y;
    private int pageNumber;
    private int displayWidth;
    private Long documentId;
    private String typeSignature;

    // ==================== GETTERS ET SETTERS ====================
    
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
    
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    
    public String getEmailDestinataire() { return emailDestinataire; }
    public void setEmailDestinataire(String emailDestinataire) { this.emailDestinataire = emailDestinataire; }
    
    public int getX() { return x; }
    public void setX(int x) { this.x = x; }
    
    public int getY() { return y; }
    public void setY(int y) { this.y = y; }
    
    public int getPageNumber() { return pageNumber; }
    public void setPageNumber(int pageNumber) { this.pageNumber = pageNumber; }
    
    public int getDisplayWidth() { return displayWidth; }
    public void setDisplayWidth(int displayWidth) { this.displayWidth = displayWidth; }
    
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    
    public String getTypeSignature() { return typeSignature; }
    public void setTypeSignature(String typeSignature) { this.typeSignature = typeSignature; }
}