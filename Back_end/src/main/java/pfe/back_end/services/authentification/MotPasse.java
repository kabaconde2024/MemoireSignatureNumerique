package pfe.back_end.services.authentification;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.notification.ServiceNotification;

import java.time.LocalDateTime;
import java.util.Random;




@Service
@RequiredArgsConstructor
public class MotPasse {


    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final ServiceNotification emailService;

    @Transactional
    public void demanderReinitialisation(String email) {
        Utilisateur u = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        String code = String.format("%06d", new Random().nextInt(1000000));
        u.setCodeMfa(code);
        u.setExpirationCodeMfa(LocalDateTime.now().plusMinutes(15));
        utilisateurRepository.save(u);

        emailService.renitialiser(email, code);
    }

    @Transactional
    public void terminerReinitialisation(String email, String code, String nouveauMdp) {
        Utilisateur u = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (u.getCodeMfa() == null || !u.getCodeMfa().equals(code) ||
                u.getExpirationCodeMfa().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Code invalide ou expiré.");
        }

        u.setMotDePasse(passwordEncoder.encode(nouveauMdp));
        u.setCodeMfa(null);
        utilisateurRepository.save(u);
    }

    @Transactional
    public void changerMotDePasse(Long userId, String ancien, String nouveau) {
        // 1. Recherche de l'utilisateur par ID
        Utilisateur u = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));


        if (!passwordEncoder.matches(ancien, u.getMotDePasse())) {
            throw new RuntimeException("L'ancien mot de passe saisi est incorrect.");
        }

        // 3. Encodage du nouveau mot de passe et sauvegarde
        u.setMotDePasse(passwordEncoder.encode(nouveau));

        // Optionnel : On réinitialise le code MFA par sécurité
        u.setCodeMfa(null);

        utilisateurRepository.save(u);
    }
}
