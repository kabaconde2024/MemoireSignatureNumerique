package pfe.back_end.modeles.entites;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "invitations_signature")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne
    @JoinColumn(name = "expediteur_id", nullable = false)
    private Utilisateur expediteur;

    @Column(nullable = false)
    private String emailDestinataire;

    private String telephoneSignataire;
    private String nomSignataire;
    private String prenomSignataire;

    @Column(unique = true, nullable = false)
    private String tokenSignature;

    @Column(name = "type_signature")
    private String typeSignature;

    private String statut;
    private LocalDateTime dateInvitation;
    private LocalDateTime dateSignature;
    private float coordonneeX;
    private float coordonneeY;
    private int pageNumber;

    @Column(name = "date_expiration")
    private LocalDateTime dateExpiration;

    @Column(name = "hash_document_signe", length = 64)
    private String hashDocumentSigne;

    @PrePersist
    protected void onCreate() {
        if (this.dateInvitation == null) {
            this.dateInvitation = LocalDateTime.now();
        }
        if (this.statut == null) {
            this.statut = "EN_ATTENTE";
        }
    }

    // ==================== GETTERS ET SETTERS ====================
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }
    
    public Utilisateur getExpediteur() { return expediteur; }
    public void setExpediteur(Utilisateur expediteur) { this.expediteur = expediteur; }
    
    public String getEmailDestinataire() { return emailDestinataire; }
    public void setEmailDestinataire(String emailDestinataire) { this.emailDestinataire = emailDestinataire; }
    
    public String getTelephoneSignataire() { return telephoneSignataire; }
    public void setTelephoneSignataire(String telephoneSignataire) { this.telephoneSignataire = telephoneSignataire; }
    
    public String getNomSignataire() { return nomSignataire; }
    public void setNomSignataire(String nomSignataire) { this.nomSignataire = nomSignataire; }
    
    public String getPrenomSignataire() { return prenomSignataire; }
    public void setPrenomSignataire(String prenomSignataire) { this.prenomSignataire = prenomSignataire; }
    
    public String getTokenSignature() { return tokenSignature; }
    public void setTokenSignature(String tokenSignature) { this.tokenSignature = tokenSignature; }
    
    public String getTypeSignature() { return typeSignature; }
    public void setTypeSignature(String typeSignature) { this.typeSignature = typeSignature; }
    
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    
    public LocalDateTime getDateInvitation() { return dateInvitation; }
    public void setDateInvitation(LocalDateTime dateInvitation) { this.dateInvitation = dateInvitation; }
    
    public LocalDateTime getDateSignature() { return dateSignature; }
    public void setDateSignature(LocalDateTime dateSignature) { this.dateSignature = dateSignature; }
    
    public float getCoordonneeX() { return coordonneeX; }
    public void setCoordonneeX(float coordonneeX) { this.coordonneeX = coordonneeX; }
    
    public float getCoordonneeY() { return coordonneeY; }
    public void setCoordonneeY(float coordonneeY) { this.coordonneeY = coordonneeY; }
    
    public int getPageNumber() { return pageNumber; }
    public void setPageNumber(int pageNumber) { this.pageNumber = pageNumber; }
    
    public LocalDateTime getDateExpiration() { return dateExpiration; }
    public void setDateExpiration(LocalDateTime dateExpiration) { this.dateExpiration = dateExpiration; }
    
    public String getHashDocumentSigne() { return hashDocumentSigne; }
    public void setHashDocumentSigne(String hashDocumentSigne) { this.hashDocumentSigne = hashDocumentSigne; }
}