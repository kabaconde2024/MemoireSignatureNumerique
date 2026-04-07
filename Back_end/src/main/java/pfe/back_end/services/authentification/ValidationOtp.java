package pfe.back_end.services.authentification;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pfe.back_end.repositories.sql.UtilisateurRepository;
import pfe.back_end.services.notification.ServiceNotification;

import java.time.LocalDateTime;



@Service
@RequiredArgsConstructor
public class ValidationOtp {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final ServiceNotification emailService;



    @Transactional(readOnly = true)
    public boolean validerOTP(String email, String code) {
        return utilisateurRepository.findByEmail(email)
                .map(u -> u.getCodeMfa() != null && u.getCodeMfa().equals(code)
                        && u.getExpirationCodeMfa().isAfter(LocalDateTime.now()))
                .orElse(false);
    }
}
