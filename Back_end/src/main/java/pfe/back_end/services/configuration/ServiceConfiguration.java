package pfe.back_end.services.configuration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pfe.back_end.modeles.entites.ConfigurationSysteme;
import pfe.back_end.repositories.sql.ConfigurationRepository;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

@Service
public class ServiceConfiguration {

    @Autowired
    private ConfigurationRepository configurationRepository;

    @PostConstruct
    public void initDefaultConfigurations() {
        // Initialiser les configurations par défaut si elles n'existent pas
        creerSiAbsent("pki.certificat.duree.minutes", "365", "Durée de validité des certificats PKI (minutes)");
        creerSiAbsent("signature.expiration.jours", "7", "Nombre de jours avant expiration du lien de signature");
        creerSiAbsent("notifications.email.enabled", "true", "Activation des notifications par email");
        creerSiAbsent("notifications.sms.enabled", "true", "Activation des SMS OTP");
        creerSiAbsent("securite.mfa.obligatoire", "false", "MFA obligatoire pour la connexion");
        creerSiAbsent("signature.otp.expiration.minutes", "10", "Expiration du code OTP (minutes)");
        creerSiAbsent("signature.otp.longueur", "6", "Longueur du code OTP");
    }

    private void creerSiAbsent(String cle, String valeurDefaut, String description) {
        if (configurationRepository.findByCle(cle).isEmpty()) {
            ConfigurationSysteme config = ConfigurationSysteme.builder()
                    .cle(cle)
                    .valeur(valeurDefaut)
                    .description(description)
                    .build();
            configurationRepository.save(config);
        }
    }

    public String getValeur(String cle) {
        return configurationRepository.findByCle(cle)
                .map(ConfigurationSysteme::getValeur)
                .orElse(null);
    }

    public int getIntValeur(String cle, int defaultValue) {
        String valeur = getValeur(cle);
        if (valeur == null) return defaultValue;
        try {
            return Integer.parseInt(valeur);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public boolean getBooleanValeur(String cle, boolean defaultValue) {
        String valeur = getValeur(cle);
        if (valeur == null) return defaultValue;
        return "true".equalsIgnoreCase(valeur) || "1".equals(valeur);
    }

    public void setValeur(String cle, String valeur) {
        ConfigurationSysteme config = configurationRepository.findByCle(cle)
                .orElse(ConfigurationSysteme.builder().cle(cle).build());
        config.setValeur(valeur);
        configurationRepository.save(config);
    }

    public Map<String, Object> getAllConfigurations() {
        Map<String, Object> configs = new HashMap<>();
        configurationRepository.findAll().forEach(config -> {
            configs.put(config.getCle(), config.getValeur());
        });
        return configs;
    }
}