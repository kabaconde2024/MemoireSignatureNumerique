package pfe.back_end.services.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.services.configuration.ServiceConfiguration;

import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class ServiceSmsOtp {

    private final Map<String, String> otpStore = new ConcurrentHashMap<>();

    @Autowired
    private ServiceConfiguration serviceConfiguration;

    /**
     * Génère un code OTP avec la longueur configurée
     */
    public String generateOtp(String phoneNumber) {
        int longueur = 6; // Valeur par défaut
        try {
            if (serviceConfiguration != null) {
                String valeur = serviceConfiguration.getValeur("signature.otp.longueur");
                if (valeur != null && !valeur.isEmpty()) {
                    longueur = Integer.parseInt(valeur);
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur lecture longueur OTP: " + e.getMessage());
        }

        String format = "%0" + longueur + "d";
        int max = (int) Math.pow(10, longueur) - 1;
        String otp = String.format(format, new Random().nextInt(max));
        otpStore.put(phoneNumber, otp);
        return otp;
    }

    /**
     * Génère un code OTP avec une longueur spécifique (surcharge)
     */
    public String generateOtp(String phoneNumber, int longueur) {
        String format = "%0" + longueur + "d";
        int max = (int) Math.pow(10, longueur) - 1;
        String otp = String.format(format, new Random().nextInt(max));
        otpStore.put(phoneNumber, otp);
        return otp;
    }

    /**
     * Simulation d'envoi de SMS
     */
    public void sendSms(String phoneNumber, String message) {
        System.out.println("SMS envoyé à " + phoneNumber + " : " + message);
    }

    /**
     * Vérifie si le code saisi est correct
     */
    public boolean verifyOtp(String phoneNumber, String userCode) {
        String validCode = otpStore.get(phoneNumber);
        if (validCode != null && validCode.equals(userCode)) {
            otpStore.remove(phoneNumber);
            return true;
        }
        return false;
    }
}