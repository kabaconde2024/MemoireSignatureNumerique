package pfe.back_end.modeles.entites;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequeteOtp {
    private String email;
    private String code;

    // ==================== GETTERS ET SETTERS ====================
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}