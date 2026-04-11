package pfe.back_end.configuration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class ConfigurationSecurite {

    @Autowired
    private FiltreJwt jwtFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Autoriser les requêtes de pré-vérification CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- ROUTES PUBLIQUES (Auth & Système) ---
                        .requestMatchers(
                                "/",
                                "/api/auth/**",
                                "/api/connexion",
                                "/api/verifier-otp",
                                "/api/activer-compte",
                                "/api/finaliser-activation",
                                "/api/mot-de-passe-oublie",
                                "/api/reinitialiser-mot-de-passe",
                                "/api/horodatage/statut"
                        ).permitAll()

                        // --- ROUTES PUBLIQUES POUR SIGNATAIRES EXTERNES (Sans compte) ---
                        .requestMatchers(
                                "/api/signature/details/**",
                                "/api/signature/apercu/**",
                                "/api/signature/send-otp",
                                "/api/signature/valider-simple",
                                "/api/signature/pki/executer",
                                "/api/invitations/verifier/**"
                        ).permitAll()

                        // --- ROUTES PRIVÉES (Rôles spécifiques) ---
                        .requestMatchers("/api/entreprise/**").hasAuthority("ADMIN_ENTREPRISE")
                        .requestMatchers("/api/super-admin/**").hasAuthority("SUPER_ADMIN")
                        
                        // --- TOUT LE RESTE (Y compris Upload et Auto-Signature) ---
                        // Nécessite d'être connecté pour que l'objet Authentication ne soit pas null
                        .anyRequest().authenticated()
                )
                // Injection du filtre JWT avant le filtre de username/password
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Configuration des origines autorisées
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000",
                "https://localhost:3000",
                "https://memoire-frontend.onrender.com"
        ));
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        // Headers autorisés
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization", 
                "Content-Type", 
                "Accept", 
                "X-Requested-With", 
                "Cache-Control",
                "Cookie"
        ));
        
        // IMPORTANT : Autoriser l'envoi des cookies (withCredentials: true côté React)
        configuration.setAllowCredentials(true);
        
        // Headers exposés au client
        configuration.setExposedHeaders(Arrays.asList(
                "Authorization", 
                "Set-Cookie",
                "Content-Disposition" // Important pour le téléchargement de fichiers
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}