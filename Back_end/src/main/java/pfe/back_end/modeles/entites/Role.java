package pfe.back_end.modeles.entites;

public enum Role {
    UTILISATEUR,        // Particulier
    ADMIN_ENTREPRISE,   // Gère les employés de sa boîte
    EMPLOYE,            // Signe au nom de l'entreprise
    SUPER_ADMIN         // Admin de la plateforme (Toi)
}