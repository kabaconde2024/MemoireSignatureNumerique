package pfe.back_end.modeles.entites;

public class SignatureRequest {
    private String token;
    private String otp;
    private String nom;
    private String telephone;

    // Getters et Setters indispensables pour Jackson (Spring)
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
}