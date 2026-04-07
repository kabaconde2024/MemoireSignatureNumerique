package pfe.back_end.repositories.sql;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pfe.back_end.modeles.entites.ConfigurationSysteme;

import java.util.Optional;

@Repository
public interface ConfigurationRepository extends JpaRepository<ConfigurationSysteme, Long> {
    Optional<ConfigurationSysteme> findByCle(String cle);
}