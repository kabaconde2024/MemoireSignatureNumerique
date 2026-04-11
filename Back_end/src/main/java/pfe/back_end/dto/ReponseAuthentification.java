
package pfe.back_end.dto;
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReponseAuthentification {
    private String accessToken; 
    
    private String type = "Bearer"; 
    
    private String email;
    private String role;
    private boolean succes;
    private String message;
    private boolean necessiteMfa;
}