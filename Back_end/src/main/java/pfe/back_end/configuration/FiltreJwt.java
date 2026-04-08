package pfe.back_end.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class FiltreJwt extends OncePerRequestFilter {

    @Autowired
    private ServiceJwt jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        
        System.out.println("🔍 [FILTRE JWT] URL: " + path + " | Méthode: " + method);

        // ✅ BYPASS pour toutes les routes publiques (pas besoin de JWT)
        if (isPublicRoute(path)) {
            System.out.println("⏩ [FILTRE JWT] Route publique, bypass JWT: " + path);
            filterChain.doFilter(request, response);
            return;
        }

        // 1. Récupérer le token depuis le cookie
        String token = recupererJwtDepuisCookie(request);
        
        System.out.println("🔍 [FILTRE JWT] Token présent: " + (token != null ? "OUI" : "NON"));

        // 2. Si le token existe et est valide
        if (token != null && jwtUtils.validateToken(token)) {
            try {
                String email = jwtUtils.getEmailFromToken(token);
                String role = jwtUtils.getRoleFromToken(token);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // Création de l'autorité (Rôle)
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);

                    // Création de l'objet d'authentification pour Spring Security
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            email, null, Collections.singletonList(authority)
                    );

                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Injection dans le contexte de sécurité
                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    System.out.println("✅ [FILTRE JWT] Auth succès - User: " + email + " | Role: " + role);
                }
            } catch (Exception e) {
                System.err.println("❌ [FILTRE JWT] Erreur traitement token: " + e.getMessage());
            }
        } else if (token == null) {
            System.out.println("⚠️ [FILTRE JWT] Aucun token trouvé pour: " + path);
        } else if (!jwtUtils.validateToken(token)) {
            System.out.println("❌ [FILTRE JWT] Token invalide pour: " + path);
        }

        // Continuer la chaîne de filtres
        filterChain.doFilter(request, response);
    }

    /**
     * Vérifie si la route est publique (ne nécessite pas de JWT)
     */
    private boolean isPublicRoute(String path) {
        // Routes OAuth2/Google
        if (path.startsWith("/oauth2/") || path.startsWith("/login/oauth2/") || path.equals("/login")) {
            return true;
        }
        
        // Routes API publiques
        if (path.startsWith("/api/public/")) {
            return true;
        }
        
        // Routes d'authentification
        if (path.startsWith("/api/auth/")) {
            return true;
        }
        
        // Routes spécifiques publiques
        if (path.equals("/api/connexion") ||
            path.equals("/api/verifier-otp") ||
            path.equals("/api/activer-compte") ||
            path.equals("/api/finaliser-activation") ||
            path.equals("/api/mot-de-passe-oublie") ||
            path.equals("/api/reinitialiser-mot-de-passe")) {
            return true;
        }
        
        // Routes signature publiques
        if (path.startsWith("/api/signature/details/") ||
            path.startsWith("/api/signature/apercu/") ||
            path.equals("/api/signature/send-otp") ||
            path.equals("/api/signature/valider-simple")) {
            return true;
        }
        
        // Routes invitations publiques
        if (path.startsWith("/api/invitations/verifier/")) {
            return true;
        }
        
        // Routes horodatage publiques
        if (path.equals("/api/horodatage/statut") ||
            path.equals("/api/horodatage/tester")) {
            return true;
        }
        
        // Options pre-flight CORS
        if (path.equals("/**") || path.startsWith("/options")) {
            return true;
        }
        
        return false;
    }

    /**
     * Méthode utilitaire pour extraire le JWT du cookie "accessToken"
     */
    private String recupererJwtDepuisCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("accessToken".equals(cookie.getName())) {
                    System.out.println("🍪 [FILTRE JWT] Cookie accessToken trouvé");
                    return cookie.getValue();
                }
            }
        }
        System.out.println("🍪 [FILTRE JWT] Aucun cookie accessToken trouvé");
        return null;
    }
}