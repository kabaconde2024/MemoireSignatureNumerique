package pfe.back_end.modeles.entites;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationRequest {
    private Long documentId;
    private String emailDestinataire;
    private String nom;
    private String telephone;
    private String typeSignature;

    // ==================== GETTERS ET SETTERS ====================
    
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    
    public String getEmailDestinataire() { return emailDestinataire; }
    public void setEmailDestinataire(String emailDestinataire) { this.emailDestinataire = emailDestinataire; }
    
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    
    public String getTypeSignature() { return typeSignature; }
    public void setTypeSignature(String typeSignature) { this.typeSignature = typeSignature; }
}