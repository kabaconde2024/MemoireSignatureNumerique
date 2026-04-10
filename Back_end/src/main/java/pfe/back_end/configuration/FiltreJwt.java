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

    // 1. Chercher d'abord dans le Header Authorization (Bearer)
    String token = null;
    String authHeader = request.getHeader("Authorization");

    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } 
    
    // 2. Si pas trouvé dans le header, chercher dans le cookie
    if (token == null) {
        token = recupererJwtDepuisCookie(request);
    }

    // 3. Validation et Authentification
    if (token != null && jwtUtils.validateToken(token)) {
        try {
            String email = jwtUtils.getEmailFromToken(token);
            String role = jwtUtils.getRoleFromToken(token);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        email, null, Collections.singletonList(authority)
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur AUTH : " + e.getMessage());
        }
    }

    filterChain.doFilter(request, response);
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