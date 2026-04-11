@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReponseAuthentification {
    private String accessToken; // On change 'token' en 'accessToken'
    
    @Builder.Default 
    private String type = "Bearer"; // Ajout de @Builder.Default pour corriger ton warning de build
    
    private String email;
    private String role;
    private boolean succes;
    private String message;
    private boolean necessiteMfa;
}