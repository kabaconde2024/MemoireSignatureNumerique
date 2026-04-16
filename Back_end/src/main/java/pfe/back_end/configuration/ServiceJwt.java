package pfe.back_end.configuration;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class ServiceJwt {

    // ⚠️ IMPORTANT: Utilisez la MÊME clé secrète en production !
    // Pour Render, utilisez une variable d'environnement
    private static final String SECRET_STRING = System.getenv().getOrDefault("JWT_SECRET", 
        "votre_cle_secrete_tres_longue_et_securisee_pour_hmac_sha384_qui_est_encore_plus_longue_1234567890");
    
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(SECRET_STRING.getBytes(StandardCharsets.UTF_8));
    private static final int EXPIRATION_TIME = 3600000; // 1 heure

    public String generateToken(String email, String role) {
        System.out.println("🔐 Génération token - Email: " + email + ", Rôle: " + role);
        
        String token = Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY)
                .compact();

        System.out.println("🔐 Token généré (début): " + token.substring(0, Math.min(30, token.length())) + "...");
        return token;
    }

    public String getEmailFromToken(String token) {
        try {
            String email = Jwts.parserBuilder()  // ✅ CORRECTION: utiliser parserBuilder()
                    .setSigningKey(SECRET_KEY)
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
            return email;
        } catch (Exception e) {
            System.err.println("❌ Erreur extraction email: " + e.getMessage());
            return null;
        }
    }

    public String getRoleFromToken(String token) {
        try {
            String role = Jwts.parserBuilder()  // ✅ CORRECTION: utiliser parserBuilder()
                    .setSigningKey(SECRET_KEY)
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .get("role", String.class);

            System.out.println("🔍 Rôle extrait du token: '" + role + "'");
            return role;
        } catch (Exception e) {
            System.err.println("❌ Erreur extraction rôle: " + e.getMessage());
            return "UTILISATEUR"; // Rôle par défaut en cas d'erreur
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()  // ✅ CORRECTION: utiliser parserBuilder()
                    .setSigningKey(SECRET_KEY)
                    .build()
                    .parseClaimsJws(token);
            System.out.println("✅ Token valide");
            return true;
        } catch (ExpiredJwtException e) {
            System.err.println("❌ Token expiré: " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            System.err.println("❌ Token non supporté: " + e.getMessage());
        } catch (MalformedJwtException e) {
            System.err.println("❌ Token malformé: " + e.getMessage());
        } catch (SignatureException e) {
            System.err.println("❌ Signature invalide: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Token argument invalide: " + e.getMessage());
        }
        return false;
    }
}