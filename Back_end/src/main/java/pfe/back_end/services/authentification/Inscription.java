package pfe.back_end.services.authentification;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pfe.back_end.modeles.entites.Role;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;

@Service
@RequiredArgsConstructor
public class Inscription {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Utilisateur inscrire(Utilisateur utilisateur) {

        if (utilisateurRepository.findByEmail(utilisateur.getEmail().toLowerCase()).isPresent()) {
            throw new RuntimeException("Un compte existe déjà avec cet email.");
        }

        utilisateur.setEmail(utilisateur.getEmail().toLowerCase().trim());
        utilisateur.setMotDePasse(passwordEncoder.encode(utilisateur.getMotDePasse()));
        utilisateur.setStatutCycleVie("ACTIF");
        utilisateur.setTokenActivation(null);

        // ✅ AJOUTER LE RÔLE PAR DÉFAUT
        if (utilisateur.getRole() == null) {
            utilisateur.setRole(Role.UTILISATEUR);  // Rôle par défaut
        }

        return utilisateurRepository.save(utilisateur);
    }
}