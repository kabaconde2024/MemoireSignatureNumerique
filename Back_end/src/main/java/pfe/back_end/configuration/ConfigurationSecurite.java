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
import java.util.Collections;

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
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- ROUTES PUBLIQUES ---
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/connexion",
                                "/api/verifier-otp",
                                "/api/activer-compte",
                                "/api/finaliser-activation",
                                "/api/mot-de-passe-oublie",
                                "/api/reinitialiser-mot-de-passe",
                                
                                // ✅ AJOUTÉ : Endpoint de test public
                                "/api/public/**",
                                
                                // ✅ AJOUTÉ : Routes OAuth2/Google
                                "/oauth2/**",
                                "/login/oauth2/**",
                                "/login/**"
                        ).permitAll()

                        // --- ROUTES SIGNATURE & INVITATIONS (PUBLIQUES) ---
                        .requestMatchers(
                                "/api/signature/details/**",
                                "/api/signature/apercu/**",
                                "/api/signature/send-otp",
                                "/api/signature/valider-simple",
                                "/api/invitations/verifier/**"
                        ).permitAll()

                        // --- ROUTES HORODATAGE (PUBLIQUES pour test) ---
                        .requestMatchers(
                                "/api/horodatage/statut",
                                "/api/horodatage/tester"
                        ).permitAll()

                        // --- ROUTES ARCHIVAGE (utilisateurs connectés) ---
                        .requestMatchers(
                                "/api/archivage/verifier/**",
                                "/api/archivage/recuperer/**",
                                "/api/archivage/exporter/**"
                        ).authenticated()

                        // --- ROUTES UTILISATEURS CONNECTÉS ---
                        .requestMatchers("/api/signature/pki/**").authenticated()
                        .requestMatchers("/api/utilisateur/pki/mon-statut").authenticated()
                        .requestMatchers("/api/entreprise/**").hasAuthority("ADMIN_ENTREPRISE")
                        .requestMatchers("/api/utilisateur/pki/request-certificate").authenticated()
                        .requestMatchers("/api/utilisateur/sauvegarder-signature").authenticated()
                        .requestMatchers("/api/super-admin/**").hasAuthority("SUPER_ADMIN")
                        .requestMatchers("/api/signature/pki/executer").authenticated()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",
            "https://localhost:3000",
            "https://memoire-frontend.onrender.com"
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