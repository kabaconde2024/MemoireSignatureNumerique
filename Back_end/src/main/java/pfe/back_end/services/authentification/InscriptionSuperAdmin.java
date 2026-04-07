package pfe.back_end.services.authentification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.modeles.entites.Role;
import pfe.back_end.repositories.sql.UtilisateurRepository;

import java.util.List;
import java.util.UUID;

@Configuration
public class InscriptionSuperAdmin {

    private static final Logger logger = LoggerFactory.getLogger(InscriptionSuperAdmin.class);

    @Value("${app.superadmin.email:admin@example.com}")
    private String emailSuperAdmin;

    @Value("${app.superadmin.password:}")
    private String motDePasseSuperAdmin;

    @Value("${app.superadmin.nom:Admin}")
    private String nomSuperAdmin;

    @Value("${app.superadmin.prenom:Super}")
    private String prenomSuperAdmin;

    @Value("${app.superadmin.telephone:+1234567890}")
    private String telephoneSuperAdmin;

    @Bean
    @Transactional
    public CommandLineRunner initialiserSuperAdmin(
            UtilisateurRepository utilisateurRepository,
            PasswordEncoder encodeurMotDePasse) {

        return args -> {
            logger.info("🔍 Vérification de l'existence du super admin...");

            // Vérifier si le mot de passe est configuré
            if (motDePasseSuperAdmin == null || motDePasseSuperAdmin.isEmpty()) {
                logger.warn("⚠️ ATTENTION: Le mot de passe du super admin n'est pas configuré!");
                logger.warn("   Veuillez définir la variable d'environnement: SUPERADMIN_PASSWORD");
                logger.warn("   Ou ajouter dans application.properties: app.superadmin.password=votre_mot_de_passe");
                return;
            }

            if (!utilisateurRepository.existsByEmail(emailSuperAdmin)) {
                logger.info("📝 Création du super admin avec email: {}", emailSuperAdmin);

                Utilisateur superAdmin = Utilisateur.builder()
                        .email(emailSuperAdmin)
                        .motDePasse(encodeurMotDePasse.encode(motDePasseSuperAdmin))
                        .nom(nomSuperAdmin)
                        .prenom(prenomSuperAdmin)
                        .telephone(telephoneSuperAdmin)
                        .role(Role.SUPER_ADMIN)
                        .statutCycleVie("ACTIF")
                        .mfaActive(false)
                        .tokenActivation(null)
                        .hsmAlias("SUPER_ADMIN_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                        .build();

                utilisateurRepository.save(superAdmin);
                logger.info("✅ Super admin créé avec succès!");

            } else {
                logger.info("✅ Super admin existe déjà avec l'email: {}", emailSuperAdmin);

                // Vérification supplémentaire : s'assurer que le rôle est bien SUPER_ADMIN
                Utilisateur adminExistant = utilisateurRepository.findByEmail(emailSuperAdmin).orElse(null);
                if (adminExistant != null) {
                    if (adminExistant.getRole() != Role.SUPER_ADMIN) {
                        adminExistant.setRole(Role.SUPER_ADMIN);
                        utilisateurRepository.save(adminExistant);
                        logger.info("🔄 Rôle corrigé à SUPER_ADMIN pour l'utilisateur existant");
                    }

                    if (!"ACTIF".equals(adminExistant.getStatutCycleVie())) {
                        adminExistant.setStatutCycleVie("ACTIF");
                        utilisateurRepository.save(adminExistant);
                        logger.info("🔄 Statut corrigé à ACTIF pour le super admin");
                    }

                    logger.info("📊 Super admin: {} {}, Email: {}, Rôle: {}",
                            adminExistant.getPrenom(), adminExistant.getNom(),
                            adminExistant.getEmail(), adminExistant.getRole());
                }
            }

            long nombreSuperAdmins = utilisateurRepository.countByRole(Role.SUPER_ADMIN);
            logger.info("📊 Nombre total de super admins dans la base: {}", nombreSuperAdmins);

            if (nombreSuperAdmins > 1) {
                logger.warn("⚠️ ATTENTION: Il y a {} super admins dans la base !", nombreSuperAdmins);

                // Optionnel : lister tous les super admins
                List<Utilisateur> listeSuperAdmins = utilisateurRepository.findByRole(Role.SUPER_ADMIN);
                for (Utilisateur admin : listeSuperAdmins) {
                    logger.warn("   - {} {} ({})", admin.getPrenom(), admin.getNom(), admin.getEmail());
                }
            }
        };
    }

    private String alignerGauche(String texte, int longueur) {
        return String.format("%-" + longueur + "s", texte);
    }
}