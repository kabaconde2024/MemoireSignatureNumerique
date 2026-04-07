package pfe.back_end.modeles.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReponseAuthentification {
    private String token;
    private String type = "Bearer";
    private String email;
    private String role;
    private boolean succes;
    private String message;
    private boolean necessiteMfa;
}