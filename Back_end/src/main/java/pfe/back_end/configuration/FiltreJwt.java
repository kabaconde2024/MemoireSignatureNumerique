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
import java.util.List;

@Component
public class FiltreJwt extends OncePerRequestFilter {

    @Autowired
    private ServiceJwt jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        
        // Log pour les endpoints d'upload
        if (uri.contains("/documents/upload") || uri.contains("/signature/")) {
            System.out.println("========================================");
            System.out.println("🔍 [FiltreJWT] Traitement de: " + uri);
            System.out.println("🔍 [FiltreJWT] Method: " + request.getMethod());
        }

        try {
            String token = recupererToken(request);
            
            if (uri.contains("/documents/upload") || uri.contains("/signature/")) {
                System.out.println("🔑 Token présent: " + (token != null ? "OUI" : "NON"));
                if (token != null) {
                    System.out.println("🔑 Token (début): " + token.substring(0, Math.min(50, token.length())) + "...");
                }
            }

            if (token != null) {
                boolean isValid = jwtUtils.validateToken(token);
                
                if (uri.contains("/documents/upload") || uri.contains("/signature/")) {
                    System.out.println("✅ Token valide: " + isValid);
                }
                
                if (isValid) {
                    String email = jwtUtils.getEmailFromToken(token);
                    String role = jwtUtils.getRoleFromToken(token);
                    
                    if (uri.contains("/documents/upload") || uri.contains("/signature/")) {
                        System.out.println("📧 Email extrait: " + email);
                        System.out.println("🎭 Rôle extrait: '" + role + "'");
                    }

                    if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        // Créer l'autorité avec le rôle
                        SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);
                        
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                email, null, Collections.singletonList(authority)
                        );
                        
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        
                        if (uri.contains("/documents/upload") || uri.contains("/signature/")) {
                            System.out.println("✅ Authentification set pour: " + email);
                            System.out.println("✅ Authorities: " + authentication.getAuthorities());
                        }
                    }
                }
            } else if (uri.contains("/documents/upload") || uri.contains("/signature/")) {
                System.out.println("❌ Aucun token trouvé dans la requête");
                // Afficher tous les headers pour debug
                System.out.println("📋 Headers reçus:");
                java.util.Collections.list(request.getHeaderNames()).forEach(header -> 
                    System.out.println("   " + header + ": " + request.getHeader(header))
                );
            }
            
            if (uri.contains("/documents/upload") || uri.contains("/signature/")) {
                System.out.println("========================================\n");
            }

        } catch (Exception e) {
            System.err.println("❌ [FiltreJWT] Erreur: " + e.getMessage());
            e.printStackTrace();
        }

        filterChain.doFilter(request, response);
    }

    private String recupererToken(HttpServletRequest request) {
        // 1. Vérifier le Header Authorization
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            System.out.println("🔑 Token trouvé dans Authorization header");
            return authHeader.substring(7);
        }

        // 2. Vérifier les cookies
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    System.out.println("🍪 Token trouvé dans cookie accessToken");
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}