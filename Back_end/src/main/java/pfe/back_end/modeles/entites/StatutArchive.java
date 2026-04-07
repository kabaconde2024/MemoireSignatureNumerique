package pfe.back_end.modeles.entites;

public enum StatutArchive {
    ACTIF,      // Disponible
    MIGRE,      // Migré vers un autre stockage
    SUPPRIME    // Supprimé (après expiration)
}