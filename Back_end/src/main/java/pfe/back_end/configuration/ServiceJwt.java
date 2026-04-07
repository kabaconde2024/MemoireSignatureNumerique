package pfe.back_end.configuration;


import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class ServiceJwt {

    private static final String SECRET_STRING = "votre_cle_secrete_tres_longue_et_securisee_pour_hmac_sha384_qui_est_encore_plus_longue_1234567890";
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(SECRET_STRING.getBytes(StandardCharsets.UTF_8));

    // 🔥 CORRECTION : On passe de 24 heures à 1 heure (3600000 ms) pour la sécurité des cookies
    private static final int EXPIRATION_TIME = 3600000;

    public String generateToken(String email, String role) {
        System.out.println("🔐 [JwtUtils] Génération token - Email: " + email);
        System.out.println("🔐 [JwtUtils] Génération token - Rôle: " + role);

        String token = Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY)
                .compact();

        System.out.println("🔐 [JwtUtils] Token généré (début): " + token.substring(0, Math.min(30, token.length())) + "...");
        return token;
    }

    public String getEmailFromToken(String token) {
        String email = Jwts.parser()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
        return email;
    }

    public String getRoleFromToken(String token) {
        try {
            String role = Jwts.parser()
                    .setSigningKey(SECRET_KEY)
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .get("role", String.class);

            System.out.println("🔍 Rôle extrait du token: '" + role + "'");
            return role;
        } catch (Exception e) {
            System.err.println("❌ Erreur extraction rôle: " + e.getMessage());
            return null;
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .setSigningKey(SECRET_KEY)
                    .build()
                    .parseClaimsJws(token);
            System.out.println("✅ Token valide");
            return true;
        } catch (Exception e) {
            System.err.println("❌ Token invalide: " + e.getMessage());
            return false;
        }
    }
}