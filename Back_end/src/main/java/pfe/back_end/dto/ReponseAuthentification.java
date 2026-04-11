package pfe.back_end.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReponseAuthentification {
    private String accessToken; 
    
    @Builder.Default
    private String type = "Bearer"; 
    
    private String email;
    private String role;
    private boolean succes;
    private String message;
    private boolean necessiteMfa;
}