package pfe.back_end.services.notification;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.TemplateEngine;

import java.io.UnsupportedEncodingException;

@Service
public class ServiceNotification {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    // ✅ Variable pour l'URL du frontend
    @Value("${app.frontend.url:https://memoire-frontend.onrender.com}")
    private String frontendUrl;

    // ✅ Email validé sur ton compte Brevo
    private final String EXPEDITEUR_EMAIL = "kabaconde5259@gmail.com";
    private final String EXPEDITEUR_NOM = "Consulting Protected";

    public void envoyerLienFinalisation(String email, String token) {
        try {
            String lien = frontendUrl + "/finaliser-inscription?token=" + token + "&email=" + email;
            Context context = new Context();
            context.setVariable("lien", lien);
            context.setVariable("logoCid", "logoNGSign");

            String htmlContent = templateEngine.process("finalisation-inscription", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(email);
            helper.setSubject("[Consulting Protected] Finalisez votre inscription");
            helper.setText(htmlContent, true);
            
            // ✅ Correction : Ajout de la gestion d'encodage pour l'expéditeur
            helper.setFrom(EXPEDITEUR_EMAIL, EXPEDITEUR_NOM);

            ClassPathResource ressourceLogo = new ClassPathResource("static/images/logo.png");
            if (ressourceLogo.exists()) {
                helper.addInline("logoNGSign", ressourceLogo);
            }

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur envoi email finalisation : " + e.getMessage());
        }
    }

   public void envoyerCodeMfa(String email, String code, int dureeExpirationMinutes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(email);
            helper.setSubject("🔐 Code de sécurité - TrustSign");

            String contenuHtml = String.format("""
            <div style='font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;'>
                <div style='background-color: #1a237e; padding: 20px; text-align: center;'>
                    <h1 style='color: #ffffff; margin: 0; font-size: 20px;'>TRUSTSIGN</h1>
                </div>
                <div style='padding: 40px 20px; text-align: center; background-color: #ffffff;'>
                    <p style='color: #64748b; font-size: 15px; margin-bottom: 25px;'>Votre code de vérification est :</p>
                    <div style='background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 12px; display: inline-block; min-width: 200px;'>
                        <span style='font-family: "Courier New", monospace; font-size: 36px; font-weight: bold; color: #1a237e; letter-spacing: 10px;'>
                            %s
                        </span>
                    </div>
                    <p style='color: #ef4444; font-size: 14px; margin-top: 20px; font-weight: bold;'>
                        ⏰ Ce code expire dans <strong>%d minute%s</strong> !
                    </p>
                    <p style='color: #94a3b8; font-size: 12px; margin-top: 15px;'>
                        Pour votre sécurité, ce code est à usage unique et expire rapidement.
                        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                    </p>
                </div>
                <div style='background-color: #f1f5f9; padding: 15px; text-align: center;'>
                    <p style='margin: 0; color: #94a3b8; font-size: 11px;'>&copy; 2026 TrustSign - Sécurité Certifiée</p>
                </div>
            </div>
            """, code, dureeExpirationMinutes, dureeExpirationMinutes > 1 ? "s" : "");

            helper.setText(contenuHtml, true);
            helper.setFrom("kabaconde5259@gmail.com", "TrustSign");
            mailSender.send(message);

            System.out.println("📧 Code MFA envoyé à " + email + " (expiration: " + dureeExpirationMinutes + " minute(s))");
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("❌ Erreur envoi email MFA: " + e.getMessage());
        }
    }


    public void renitialiser(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Votre code de sécurité - MonPFE");
        message.setText("Voici votre code de vérification pour la réinitialisation de votre mot de passe : " + code);
        
        message.setFrom(EXPEDITEUR_EMAIL);
        
        mailSender.send(message);
    }

    public void envoyerLienSignature(String emailDestinataire, String nomExpediteur, String nomDoc, String token, String typeSignature) {
        String lien;
        String typeAffichage;
        String couleurBouton;

        if ("pki".equalsIgnoreCase(typeSignature)) {
            lien = frontendUrl + "/signature-pki/" + token;
            typeAffichage = "🔐 Signature PKI (Certificat numérique)";
            couleurBouton = "#2e7d32";
        } else {
            lien = frontendUrl + "/signature-simple/" + token;
            typeAffichage = "📝 Signature simple";
            couleurBouton = "#ffcc00";
        }

        String contenuHtml = String.format("""
        <div style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #eee; padding: 20px;">
            <div style="margin-top: 20px; background-color: #f9f9f9; padding: 40px;">
                <img src="https://cdn-icons-png.flaticon.com/512/281/281760.png" width="80" />
                <h2>Bonjour %s</h2>
                <p>%s vous a envoyé une demande de signature pour le document <strong>%s</strong>.</p>
                <div style="background-color: #e8f5e9; padding: 10px; border-radius: 8px; margin: 15px auto; display: inline-block;">
                    <span style="font-weight: bold; color: %s;">%s</span>
                </div>
                <p>Pour faire suite à cette invitation, nous vous invitons à suivre le bouton ci-dessous.</p>
                <a href="%s" style="background-color: %s; color: black; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px;">SIGNER LE DOCUMENT</a>
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">© 2026 NGSign Team</p>
        </div>
        """,
                emailDestinataire,
                nomExpediteur,
                nomDoc,
                couleurBouton,
                typeAffichage,
                lien,
                couleurBouton
        );

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(emailDestinataire);
            helper.setSubject("[NGSign] " + nomExpediteur + " vous invite à signer un document - " + typeAffichage);
            helper.setText(contenuHtml, true);
            
            // ✅ Correction : Ajout de la gestion d'encodage (Ligne 162/163)
            helper.setFrom(EXPEDITEUR_EMAIL, EXPEDITEUR_NOM);
            
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur envoi email signature : " + e.getMessage());
        }
    }
}