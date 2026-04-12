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

    // ✅ CORRECTION : Utilisation des noms exacts des variables d'environnement définies sur Render
    @Value("${SUPERADMIN_EMAIL:admin@example.com}")
    private String emailSuperAdmin;

    @Value("${SUPERADMIN_PASSWORD:}")
    private String motDePasseSuperAdmin;

    @Value("${SUPERADMIN_NOM:Admin}")
    private String nomSuperAdmin;

    @Value("${SUPERADMIN_PRENOM:Super}")
    private String prenomSuperAdmin;

    @Value("${SUPERADMIN_TELEPHONE:+21600000000}")
    private String telephoneSuperAdmin;

    @Bean
    @Transactional
    public CommandLineRunner initialiserSuperAdmin(
            UtilisateurRepository utilisateurRepository,
            PasswordEncoder encodeurMotDePasse) {

        return args -> {
            logger.info("🔍 Vérification de l'existence du super admin...");

            // 1. Sécurité : Vérifier si le mot de passe est bien injecté
            if (motDePasseSuperAdmin == null || motDePasseSuperAdmin.isEmpty()) {
                logger.error("❌ ERREUR CRITIQUE: Le mot de passe du super admin est vide !");
                logger.error("Vérifiez la variable d'environnement 'SUPERADMIN_PASSWORD' sur Render.");
                return; // On arrête pour ne pas créer un compte sans mot de passe
            }

            // 2. Vérification par email (Ignorer la casse pour plus de sécurité)
            if (!utilisateurRepository.existsByEmail(emailSuperAdmin)) {
                logger.info("📝 Création du compte SuperAdmin : {}", emailSuperAdmin);

                Utilisateur superAdmin = Utilisateur.builder()
                        .email(emailSuperAdmin)
                        .motDePasse(encodeurMotDePasse.encode(motDePasseSuperAdmin))
                        .nom(nomSuperAdmin)
                        .prenom(prenomSuperAdmin)
                        .telephone(telephoneSuperAdmin)
                        .role(Role.SUPER_ADMIN)
                        .statutCycleVie("ACTIF")
                        .mfaActive(false)
                        .hsmAlias("SUPER_ADMIN_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                        .build();

                utilisateurRepository.save(superAdmin);
                logger.info("✅ Super admin créé avec succès dans la base PostgreSQL.");

            } else {
                logger.info("ℹ️ L'utilisateur {} existe déjà. Vérification des droits...", emailSuperAdmin);

                // 3. Mise à jour préventive des droits si l'utilisateur existe déjà
                utilisateurRepository.findByEmail(emailSuperAdmin).ifPresent(admin -> {
                    boolean modifie = false;
                    
                    if (admin.getRole() != Role.SUPER_ADMIN) {
                        admin.setRole(Role.SUPER_ADMIN);
                        modifie = true;
                    }
                    if (!"ACTIF".equals(admin.getStatutCycleVie())) {
                        admin.setStatutCycleVie("ACTIF");
                        modifie = true;
                    }

                    if (modifie) {
                        utilisateurRepository.save(admin);
                        logger.info("🔄 Rôle et statut mis à jour pour le SuperAdmin.");
                    }
                });
            }

            long totalAdmins = utilisateurRepository.countByRole(Role.SUPER_ADMIN);
            logger.info("📊 Nombre total de SUPER_ADMIN en base : {}", totalAdmins);
        };
    }
}