package pfe.back_end.dto;

import lombok.Data;

@Data
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
}