package pfe.back_end.services.authentification;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pfe.back_end.dto.RequeteConnexion;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.configuration.ServiceConfiguration;
import pfe.back_end.services.notification.ServiceNotification;

import java.time.LocalDateTime;
import java.util.Random;



@Service
@RequiredArgsConstructor
public class Connexion {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final ServiceNotification emailService;
    private final ServiceConfiguration serviceConfiguration;  // ✅ Injecter


    @Transactional
    public pfe.back_end.modeles.dto.ReponseAuthentification connecter(RequeteConnexion requete) {
        Utilisateur u = utilisateurRepository.findByEmail(requete.getEmail())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!passwordEncoder.matches(requete.getMotDePasse(), u.getMotDePasse())) {
            throw new RuntimeException("Identifiants invalides");
        }

        String code = String.format("%06d", new Random().nextInt(1000000));
        u.setCodeMfa(code);

        // ✅ Utiliser la durée configurable (défaut: 1 minute)
        int dureeExpirationMinutes = serviceConfiguration.getMfaCodeExpirationMinutes();
        u.setExpirationCodeMfa(LocalDateTime.now().plusMinutes(dureeExpirationMinutes));
        utilisateurRepository.save(u);

        // ✅ Passer la durée au service d'envoi d'email
        emailService.envoyerCodeMfa(u.getEmail(), code, dureeExpirationMinutes);

        return pfe.back_end.modeles.dto.ReponseAuthentification.builder()
                .succes(true)
                .necessiteMfa(true)
                .email(u.getEmail())
                .build();
    }
}
