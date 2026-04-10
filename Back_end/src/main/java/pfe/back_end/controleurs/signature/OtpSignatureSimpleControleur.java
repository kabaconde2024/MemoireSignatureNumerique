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

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.JavaMailSender;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/signature")
@CrossOrigin(origins = "*") // En production, remplace par ton URL frontend
public class OtpSignatureSimpleControleur {

    @Autowired private InvitationRepository invitationRepository;
    @Autowired private ServiceSmsOtp smsService; // Pour la génération de l'OTP
    @Autowired private JavaMailSender mailSender;
    @Autowired private ServiceConfiguration serviceConfiguration;

    // Récupère l'expéditeur configuré (souvent le username Brevo)
    @Value("${spring.mail.username}")
    private String mailFrom;
// Dans OtpSignatureSimpleControleur.java

@PostMapping("/send-otp")
public ResponseEntity<?> sendOtp(@RequestParam String token) {
    try {
        InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                .orElseThrow(() -> new RuntimeException("Invitation introuvable"));

        // On utilise l'email pour la génération et le stockage de l'OTP
        String emailDestinataire = inv.getEmailDestinataire(); 
        
        int otpLongueur = Integer.parseInt(serviceConfiguration.getValeur("signature.otp.longueur"));
        
        // On génère l'OTP lié à l'email (clé du ConcurrentHashMap)
        String code = smsService.generateOtp(emailDestinataire, otpLongueur);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(emailDestinataire);
        message.setSubject("🔑 Code de sécurité TrustSign");
        message.setText("Bonjour " + inv.getNomSignataire() + ",\n\n" +
                "Votre code OTP pour la signature du document est : " + code);

        mailSender.send(message);
        return ResponseEntity.ok(Map.of("message", "Code envoyé à " + emailDestinataire));
    } catch (Exception e) {
        return ResponseEntity.status(500).body(Map.of("erreur", e.getMessage()));
    }
}

}