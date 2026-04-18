package pfe.back_end.modeles.entites;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "utilisateurs")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Utilisateur {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    @JsonIgnore
    private String motDePasse;

    private String nom;
    private String prenom;
    private String telephone;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String statutCycleVie;

    @Column(name = "hsm_alias", unique = true)
    private String hsmAlias;

    @Transient
    private byte[] clePrivee;

    @Column(name = "token_activation")
    private String tokenActivation;

    private boolean mfaActive;

    @JsonIgnore
    private String codeMfa;
    private LocalDateTime expirationCodeMfa;

    @Column(name = "image_signature", columnDefinition = "TEXT")
    private String imageSignature;

    @Column(columnDefinition = "TEXT")
    private String certificatPem;

    @JsonProperty("statut")
    @Column(name = "status_pki")
    private String statusPki = "NONE";

    @Column(name = "photo_profil", columnDefinition = "TEXT")
    private String photoProfil;

    private LocalDateTime expirationDate;

    // ==================== GETTERS ET SETTERS ====================
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getMotDePasse() { return motDePasse; }
    public void setMotDePasse(String motDePasse) { this.motDePasse = motDePasse; }
    
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    
    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    
    public String getStatutCycleVie() { return statutCycleVie; }
    public void setStatutCycleVie(String statutCycleVie) { this.statutCycleVie = statutCycleVie; }
    
    public String getHsmAlias() { return hsmAlias; }
    public void setHsmAlias(String hsmAlias) { this.hsmAlias = hsmAlias; }
    
    public byte[] getClePrivee() { return clePrivee; }
    public void setClePrivee(byte[] clePrivee) { this.clePrivee = clePrivee; }
    
    public String getTokenActivation() { return tokenActivation; }
    public void setTokenActivation(String tokenActivation) { this.tokenActivation = tokenActivation; }
    
    public boolean isMfaActive() { return mfaActive; }
    public void setMfaActive(boolean mfaActive) { this.mfaActive = mfaActive; }
    
    public String getCodeMfa() { return codeMfa; }
    public void setCodeMfa(String codeMfa) { this.codeMfa = codeMfa; }
    
    public LocalDateTime getExpirationCodeMfa() { return expirationCodeMfa; }
    public void setExpirationCodeMfa(LocalDateTime expirationCodeMfa) { this.expirationCodeMfa = expirationCodeMfa; }
    
    public String getImageSignature() { return imageSignature; }
    public void setImageSignature(String imageSignature) { this.imageSignature = imageSignature; }
    
    public String getCertificatPem() { return certificatPem; }
    public void setCertificatPem(String certificatPem) { this.certificatPem = certificatPem; }
    
    public String getStatusPki() { return statusPki; }
    public void setStatusPki(String statusPki) { this.statusPki = statusPki; }
    
    public String getPhotoProfil() { return photoProfil; }
    public void setPhotoProfil(String photoProfil) { this.photoProfil = photoProfil; }
    
    public LocalDateTime getExpirationDate() { return expirationDate; }
    public void setExpirationDate(LocalDateTime expirationDate) { this.expirationDate = expirationDate; }
}