package pfe.back_end.configuration;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class ServiceJwt {

    private static final String SECRET = "votre_cle_secrete_tres_longue_et_securisee_pour_hmac_sha384_qui_est_encore_plus_longue_1234567890";
    private static final int EXPIRATION_TIME = 3600000;

    // Nouvelle méthode pour générer la clé de manière sécurisée (obligatoire en 0.12+)
    private SecretKey getSigningKey() {
        byte[] keyBytes = SECRET.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String email, String role) {
        System.out.println("🔐 Génération token - Email: " + email + ", Rôle: " + role);
        
        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(getSigningKey()) // Plus besoin de SignatureAlgorithm, il est déduit de la clé
                .compact();
    }

    public String getEmailFromToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey()) // Remplace setSigningKey
                    .build()
                    .parseSignedClaims(token) // Remplace parseClaimsJws
                    .getPayload() // Remplace getBody
                    .getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    public String getRoleFromToken(String token) {
        try {
            return (String) Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .get("role");
        } catch (Exception e) {
            return "UTILISATEUR";
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}