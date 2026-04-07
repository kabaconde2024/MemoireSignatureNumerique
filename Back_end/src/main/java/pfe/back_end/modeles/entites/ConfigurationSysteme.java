package pfe.back_end.modeles.entites;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "configuration_systeme")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigurationSysteme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String cle;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String valeur;

    private String description;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @PreUpdate
    @PrePersist
    protected void onUpdate() {
        dateModification = LocalDateTime.now();
    }
}