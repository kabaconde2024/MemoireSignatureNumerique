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

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestParam String token) {
        try {
            // 1. Trouver l'invitation
            InvitationSignature inv = invitationRepository.findByTokenSignature(token)
                    .orElseThrow(() -> new RuntimeException("Invitation introuvable"));

            if (!"EN_ATTENTE".equals(inv.getStatut())) {
                return ResponseEntity.badRequest().body(Map.of("erreur", "Cette invitation n'est plus valide ou déjà signée"));
            }

            // 2. Générer l'OTP (on réutilise ton service existant)
            int otpLongueur = Integer.parseInt(serviceConfiguration.getValeur("signature.otp.longueur"));
            String code = smsService.generateOtp(inv.getTelephoneSignataire(), otpLongueur);

            // 3. Préparer l'Email Transactionnel via Brevo
            String emailDestinataire = inv.getEmailSignataire(); 
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom); // Obligatoire avec Brevo
            message.setTo(emailDestinataire);
            message.setSubject("🔑 Votre code de sécurité TrustSign");
            message.setText("Bonjour " + inv.getNomSignataire() + ",\n\n" +
                    "Vous avez initié une signature électronique sur la plateforme TrustSign.\n" +
                    "Veuillez saisir le code de confirmation suivant pour valider votre identité :\n\n" +
                    "👉 CODE OTP : " + code + "\n\n" +
                    "Ce code est valable pour une durée limitée.\n" +
                    "Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.\n\n" +
                    "L'équipe TrustSign PKI.");

            // 4. Envoi effectif
            mailSender.send(message);

            // Log de confirmation pour Render (visible dans Dashboard > Logs)
            System.out.println("✅ [Brevo] OTP [" + code + "] envoyé avec succès à : " + emailDestinataire);

            return ResponseEntity.ok(Map.of(
                "message", "Le code de validation a été envoyé à l'adresse " + emailDestinataire
            ));
            
        } catch (Exception e) {
            // Log de l'erreur précise pour le debug
            System.err.println("❌ [Brevo Error] : " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("erreur", "Échec de l'envoi de l'email via Brevo : " + e.getMessage()));
        }
    }
}