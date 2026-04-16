package pfe.back_end.configuration;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class ServiceJwt {

    private static final String SECRET = "votre_cle_secrete_tres_longue_et_securisee_pour_hmac_sha384_qui_est_encore_plus_longue_1234567890";
    private static final int EXPIRATION_TIME = 3600000;

    public String generateToken(String email, String role) {
        System.out.println("🔐 Génération token - Email: " + email + ", Rôle: " + role);
        
        String token = Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SignatureAlgorithm.HS256, SECRET.getBytes())
                .compact();

        System.out.println("🔐 Token généré: " + token.substring(0, Math.min(30, token.length())) + "...");
        return token;
    }

    public String getEmailFromToken(String token) {
        try {
            return Jwts.parser()
                    .setSigningKey(SECRET.getBytes())
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
        } catch (Exception e) {
            System.err.println("❌ Erreur extraction email: " + e.getMessage());
            return null;
        }
    }

    public String getRoleFromToken(String token) {
        try {
            String role = (String) Jwts.parser()
                    .setSigningKey(SECRET.getBytes())
                    .parseClaimsJws(token)
                    .getBody()
                    .get("role");

            System.out.println("🔍 Rôle extrait: '" + role + "'");
            return role;
        } catch (Exception e) {
            System.err.println("❌ Erreur extraction rôle: " + e.getMessage());
            return "UTILISATEUR";
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(SECRET.getBytes()).parseClaimsJws(token);
            System.out.println("✅ Token valide");
            return true;
        } catch (Exception e) {
            System.err.println("❌ Token invalide: " + e.getMessage());
            return false;
        }
    }
}