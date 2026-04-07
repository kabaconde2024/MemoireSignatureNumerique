package pfe.back_end.modeles.entites;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties; // 🔥 AJOUT DE L'IMPORT
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "utilisateurs")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
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

    @JsonIgnore // 🛡️ Sécurité : On ne renvoie pas le code OTP brut au front-end React
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

    public String getPhotoProfil() { return photoProfil; }
    public void setPhotoProfil(String photoProfil) { this.photoProfil = photoProfil; }



    public String getCertificatPem() { return certificatPem; }
    public void setCertificatPem(String certificatPem) { this.certificatPem = certificatPem; }

    public String getStatusPki() { return statusPki; }
    public void setStatusPki(String statusPki) { this.statusPki = statusPki; }


    private LocalDateTime expirationDate;

    public LocalDateTime getExpirationDate() {
        return expirationDate;
    }

    public void setExpirationDate(LocalDateTime expirationDate) {
        this.expirationDate = expirationDate;
    }
}