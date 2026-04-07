package pfe.back_end.services.authentification;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.repositories.sql.UtilisateurRepository;

@Service
@RequiredArgsConstructor
public class ActivationCompte {

    private final UtilisateurRepository utilisateurRepository;

    @Transactional
    public void activerCompte(String token) {
        Utilisateur u = utilisateurRepository.findByTokenActivation(token)
                .orElseThrow(() -> new RuntimeException("Lien d'activation invalide ou expiré."));

        u.setTokenActivation(null);
        u.setStatutCycleVie("ACTIF");
        utilisateurRepository.save(u);
    }
}