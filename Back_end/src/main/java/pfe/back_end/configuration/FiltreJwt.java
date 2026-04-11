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

        // Log uniquement en développement ou pour debug
        boolean isDebug = request.getHeader("X-Debug-Mode") != null;
        String uri = request.getRequestURI();
        
        // Ne log que les endpoints sensibles ou en debug
        if (isDebug || uri.contains("/documents/upload") || uri.contains("/signature/")) {
            System.out.println("🔍 [FiltreJWT] URL: " + uri);
        }

        try {
            String token = recupererToken(request);
            
            if (isDebug && token != null) {
                System.out.println("🔍 [FiltreJWT] Token trouvé, longueur: " + token.length());
            }

            if (token != null && jwtUtils.validateToken(token)) {
                String email = jwtUtils.getEmailFromToken(token);
                String role = jwtUtils.getRoleFromToken(token);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);
                    
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            email, null, Collections.singletonList(authority)
                    );
                    
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    if (isDebug) {
                        System.out.println("✅ [FiltreJWT] Utilisateur authentifié: " + email + " (rôle: " + role + ")");
                    }
                }
            } else if (isDebug) {
                System.out.println("❌ [FiltreJWT] Authentification échouée pour: " + uri);
            }
        } catch (Exception e) {
            System.err.println("❌ [FiltreJWT] Erreur: " + e.getMessage());
            if (isDebug) e.printStackTrace();
        }

        filterChain.doFilter(request, response);
    }

    private String recupererToken(HttpServletRequest request) {
        // Priorité au Header Authorization
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        // Sinon, chercher dans les cookies
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