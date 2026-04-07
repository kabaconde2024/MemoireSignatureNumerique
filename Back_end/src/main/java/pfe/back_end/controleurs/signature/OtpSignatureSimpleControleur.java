package pfe.back_end.controleurs.signature;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pfe.back_end.modeles.entites.InvitationSignature;
import pfe.back_end.repositories.sql.InvitationRepository;
import pfe.back_end.services.configuration.ServiceConfiguration;
import pfe.back_end.services.notification.ServiceSmsOtp;
import java.util.Map;

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
