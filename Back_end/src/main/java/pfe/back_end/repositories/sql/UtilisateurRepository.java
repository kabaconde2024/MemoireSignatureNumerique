package pfe.back_end.repositories.sql;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pfe.back_end.modeles.entites.Utilisateur;
import pfe.back_end.modeles.entites.Role;

import java.util.List;
import java.util.Optional;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {


    Optional<Utilisateur> findByEmailIgnoreCase(String email);

    Optional<Utilisateur> findByEmail(String email);

   // boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

  //  Optional<Utilisateur> findByCodeMfa(String codeMfa);

    Optional<Utilisateur> findByTokenActivation(String token);

   // List<Utilisateur> findAllByStatutCycleVie(String statut);

    List<Utilisateur> findByRole(Role role);

    long countByRole(Role role);

   // long countByStatusPki(String statusPki);

    List<Utilisateur> findAllByStatusPki(String statusPki);
}