package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value; // 👈 IMPORT MANQUANT QUI CAUSE L'ERREUR
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.JavaMailSender; // 👈 VÉRIFIE QUE LE POM.XML EST BIEN ENREGISTRÉ
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.services.configuration.ServiceConfiguration;
import pfe.back_end.services.notification.ServiceSmsOtp;

import java.util.Map;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = "*") 
public class OtpSignatureSimpleControleur {

    @Autowired private InvitationRepository invitationRepository;
    @Autowired private ServiceSmsOtp otpService; 
    @Autowired private JavaMailSender mailSender;
    @Autowired private ServiceConfiguration serviceConfiguration;

    @Value("${spring.mail.username}")
    private String mailFrom;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestParam String token) {
        try {
            InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation introuvable"));

            if (!"EN_ATTENTE".equals(inv.getStatut())) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Cette invitation n'est plus active."));
            }

            String emailDestinataire = inv.getEmailDestinataire();
            int otpLongueur = 6; 
            
            try {
                String valConfig = serviceConfiguration.getValeur("signature.otp.longueur");
                if (valConfig != null) {
                    otpLongueur = Integer.parseInt(valConfig);
                }
            } catch (Exception e) {
                // Fallback si la config est absente ou invalide
            }

            // Génération de l'OTP
            String code = otpService.generateOtp(emailDestinataire, otpLongueur);

            // Préparation de l'e-mail
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(emailDestinataire);
            message.setSubject("🔑 Code de sécurité TrustSign");
            message.setText("Bonjour " + inv.getNomSignataire() + ",\n\n" +
                    "Pour finaliser votre signature numérique, voici votre code de validation : " + code + 
                    "\n\nCe code expirera prochainement.\n\n" +
                    "Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet e-mail.");

            mailSender.send(message);
            
            return ResponseEntity.ok(Map.of("message", "Code envoyé avec succès à l'adresse enregistrée."));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", "Erreur lors de l'envoi : " + e.getMessage()));
        }
    }
}