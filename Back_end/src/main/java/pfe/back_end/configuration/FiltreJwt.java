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

        try {
            // 1. Chercher le token (Header ou Cookie)
            String token = recupererToken(request);

            // 2. Validation et Authentification
            if (token != null && jwtUtils.validateToken(token)) {
                String email = jwtUtils.getEmailFromToken(token);
                String role = jwtUtils.getRoleFromToken(token);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // Création de l'autorité à partir du rôle (ex: ROLE_USER ou ADMIN_ENTREPRISE)
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);
                    
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            email, null, Collections.singletonList(authority)
                    );
                    
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // Injection dans le contexte de sécurité
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    // Log discret pour le debug sur Render
                    // System.out.println("✅ Utilisateur authentifié via JWT : " + email);
                }
            }
        } catch (Exception e) {
            // Log d'erreur critique (utile en phase de test sur Render)
            System.err.println("❌ Erreur dans FiltreJwt : " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Stratégie d'extraction du token : Priorité Header, puis Cookie
     */
    private String recupererToken(HttpServletRequest request) {
        // A. Vérification dans le Header Authorization
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        // B. Vérification dans les Cookies (accessToken)
        return recupererJwtDepuisCookie(request);
    }

    /**
     * Méthode utilitaire pour extraire le JWT du cookie "accessToken"
     */
    private String recupererJwtDepuisCookie(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}