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
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity; 
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
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

                        // ==================== ROUTES PUBLIQUES ====================
                        // Routes d'authentification et système
                        .requestMatchers(
                                "/",
                                "/api/auth/**",
                                "/api/connexion",
                                "/api/verifier-otp",
                                "/api/activer-compte",
                                "/api/finaliser-activation",
                                "/api/mot-de-passe-oublie",
                                "/api/reinitialiser-mot-de-passe",
                                "/api/horodatage/statut",
                                "/api/auth/check",
                                "/api/debug/**"
                        ).permitAll()

                        // Routes publiques pour signatures externes (sans authentification)
                        .requestMatchers(
                                "/api/signature/details/**",
                                "/api/signature/apercu/**",
                                "/api/signature/send-otp",
                                "/api/signature/valider-simple",
                                "/api/signature/pki/executer",
                                "/api/invitations/verifier/**"
                        ).permitAll()


                          .requestMatchers(
                                "/api/ia/logs/public",     // Endpoint public avec clé API
                                "/api/ia/health",          // Health check
                                "/api/ia/anomalies",       // Réception anomalies
                                "/api/ia/rapports"         // Réception rapports
                        ).permitAll()  // Ces endpoints sont publics mais protégés par clé API


                        // ✅ AJOUT : Endpoint public pour le service IA (temporaire)
                        .requestMatchers(
                                "/api/admin/audit/ia-data",
                                "/api/admin/audit/test"
                        ).permitAll()

                        // ==================== ROUTES PRIVÉES (Rôles spécifiques) ====================
                        .requestMatchers("/api/entreprise/**").hasAuthority("ADMIN_ENTREPRISE")
                        .requestMatchers("/api/super-admin/**").hasAuthority("SUPER_ADMIN")
                        
                        // ==================== ROUTES AUTHENTIFIÉES (Sans rôle spécifique) ====================
                        // Routes nécessitant juste d'être connecté
                        .requestMatchers(
                                "/api/documents/upload",
                                "/api/signature/appliquer-auto-signature",
                                "/api/documents/**",
                                "/api/utilisateur/**"
                        ).authenticated()
                        
                        // ==================== TOUT LE RESTE ====================
                        // Par défaut, nécessite authentification
                        .anyRequest().authenticated()
                )
                // Injection du filtre JWT avant le filtre de username/password
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

   @Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(
        "https://localhost:3000",
        "http://localhost:3000",
        "https://trustsign-frontend.onrender.com",  // ✅ AJOUTER CETTE LIGNE
        "https://trustsign-backend-3zsj.onrender.com"
    ));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
    configuration.setAllowedHeaders(Arrays.asList(
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Requested-With",
        "Cache-Control"
    ));
    configuration.setAllowCredentials(true);
    configuration.setExposedHeaders(Collections.singletonList("Authorization"));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
}