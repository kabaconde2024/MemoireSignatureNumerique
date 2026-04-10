package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.services.configuration.ServiceConfiguration;
import pfe.back_end.services.notification.ServiceSmsOtp;
import java.util.Map;


/*
@RestController  // ✅ AJOUTER CETTE ANNOTATION
@RequestMapping("/api/signature")  // ✅ AJOUTER CETTE ANNOTATION
@CrossOrigin(origins = "https://localhost:3000", allowCredentials = "true")
public class OtpSignatureSimpleControleur {


    @Autowired private InvitationRepository invitationRepository;
    @Autowired private ServiceSmsOtp smsService;


    @Autowired
    private ServiceConfiguration serviceConfiguration;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestParam String token) {
        try {
            InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation introuvable"));

            if (!"EN_ATTENTE".equals(inv.getStatut())) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Déjà signé ou invalide"));
            }

            // Vérifier si SMS est activé
            boolean smsEnabled = Boolean.parseBoolean(
                    serviceConfiguration.getValeur("notifications.sms.enabled"));

            if (!smsEnabled) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "L'envoi de SMS est désactivé"));
            }

            int otpLongueur = Integer.parseInt(
                    serviceConfiguration.getValeur("signature.otp.longueur"));

            String code = smsService.generateOtp(inv.getTelephoneSignataire(), otpLongueur);
            smsService.sendSms(inv.getTelephoneSignataire(), "Votre code de validation TrustSign est : " + code);

            return ResponseEntity.ok(Map.of("message", "SMS envoyé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
        }
    }


}
*/
// ... imports existants ...
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.JavaMailSender;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = "*") 
public class OtpSignatureSimpleControleur {

    @Autowired private InvitationRepository invitationRepository;
    @Autowired private ServiceSmsOtp otpService; // Renommé par souci de clarté
    @Autowired private JavaMailSender mailSender;
    @Autowired private ServiceConfiguration serviceConfiguration;

    @Value("${spring.mail.username}")
    private String mailFrom;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestParam String token) {
        try {
            InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation introuvable"));

            // Validation du statut pour la sécurité
            if (!"EN_ATTENTE".equals(inv.getStatut())) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Cette invitation n'est plus active."));
            }

            String emailDestinataire = inv.getEmailDestinataire();
            int otpLongueur = 6; // Valeur par défaut
            
            try {
                otpLongueur = Integer.parseInt(serviceConfiguration.getValeur("signature.otp.longueur"));
            } catch (Exception e) {
                // Fallback si la config manque
            }

            // Génération de l'OTP (stocké dans le ConcurrentHashMap du service)
            String code = otpService.generateOtp(emailDestinataire, otpLongueur);

            // Préparation de l'e-mail
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(emailDestinataire);
            message.setSubject("🔑 Code de sécurité TrustSign");
            message.setText("Bonjour " + inv.getNomSignataire() + ",\n\n" +
                    "Pour finaliser votre signature numérique, voici votre code de validation : " + code + 
                    "\n\nCe code expirera prochainement.");

            mailSender.send(message);
            
            return ResponseEntity.ok(Map.of("message", "Code envoyé avec succès à l'adresse enregistrée."));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erreur", "Erreur lors de l'envoi : " + e.getMessage()));
        }
    }
}