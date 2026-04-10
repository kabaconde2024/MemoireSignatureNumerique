package pfe.back_end.services.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.services.configuration.ServiceConfiguration;

import java.security.SecureRandom; // Plus sécurisé pour la crypto
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class ServiceSmsOtp {

    // On utilise ConcurrentHashMap pour gérer les accès simultanés
    private final Map<String, String> otpStore = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    private ServiceConfiguration serviceConfiguration;

    /**
     * Génère un code OTP et le stocke avec une clé (Email ou Tel)
     */
    public String generateOtp(String identifier, int longueur) {
        // Génération sécurisée
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < longueur; i++) {
            otp.append(secureRandom.nextInt(10));
        }
        
        String code = otp.toString();
        otpStore.put(identifier, code); // L'identifiant est l'email ici
        return code;
    }

    /**
     * Surcharge avec longueur par défaut lue depuis la config
     */
    public String generateOtp(String identifier) {
        int longueur = 6;
        try {
            String val = serviceConfiguration.getValeur("signature.otp.longueur");
            if (val != null) longueur = Integer.parseInt(val);
        } catch (Exception e) {
            // Fallback à 6
        }
        return generateOtp(identifier, longueur);
    }

    /**
     * Vérifie le code
     * IMPORTANT : L'identifiant doit être le même que lors de la génération (l'email)
     */
    public boolean verifyOtp(String identifier, String userCode) {
        if (identifier == null || userCode == null) return false;
        
        String validCode = otpStore.get(identifier);
        if (validCode != null && validCode.equals(userCode)) {
            otpStore.remove(identifier); // On supprime après usage (Usage unique)
            return true;
        }
        return false;
    }
}