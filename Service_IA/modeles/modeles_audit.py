# service_ia/modeles/modeles_audit.py
from pydantic import BaseModel, Field, validator, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
import uuid

# ============================================
# ÉNUMÉRATIONS
# ============================================

class TypeEvenement(str, Enum):
    """Types d'événements possibles dans les logs d'audit"""
    SIGNATURE_DOCUMENT = "SIGNATURE_DOCUMENT"
    ENVOI_INVITATION = "ENVOI_INVITATION"
    GENERATION_CERTIFICAT = "GENERATION_CERTIFICAT"
    CONNEXION = "CONNEXION"
    INSCRIPTION = "INSCRIPTION"
    DEMANDE_CERTIFICAT = "DEMANDE_CERTIFICAT"
    APPROBATION_CERTIFICAT = "APPROBATION_CERTIFICAT"
    RENOUVELLEMENT_CERTIFICAT = "RENOUVELLEMENT_CERTIFICAT"
    ACTIVATION_COMPTE = "ACTIVATION_COMPTE"
    VALIDATION_OTP = "VALIDATION_OTP"
    SIGNATURE_AUTO = "AUTO_SIGNATURE"


class NiveauRisque(str, Enum):
    """Niveaux de risque possibles"""
    CRITIQUE = "CRITIQUE"
    ELEVE = "ELEVE"
    MOYEN = "MOYEN"
    FAIBLE = "FAIBLE"
    INCONNU = "INCONNU"


class TypeAnomalie(str, Enum):
    """Types d'anomalies détectables"""
    TENTATIVE_CONNEXION_ECHOUEE = "TENTATIVE_CONNEXION_ECHOUEE"
    SIGNATURE_ECHOUEE = "SIGNATURE_ECHOUEE"
    HORAIRE_INHABITUEL = "HORAIRE_INHABITUEL"
    CONNEXION_DEPUIS_IP_EXTERNE = "CONNEXION_DEPUIS_IP_EXTERNE"
    COMPORTEMENT_TRES_ANORMAL = "COMPORTEMENT_TRES_ANORMAL"
    COMPORTEMENT_ANORMAL = "COMPORTEMENT_ANORMAL"
    ACTIVITE_SUSPECTE = "ACTIVITE_SUSPECTE"
    PIC_ACTIVITE = "PIC_ACTIVITE"
    ATTAQUE_POTENTIELLE = "ATTAQUE_POTENTIELLE"


class StatutAlerte(str, Enum):
    """Statuts possibles pour une alerte"""
    ENVOYEE = "ENVOYEE"
    EN_ATTENTE = "EN_ATTENTE"
    ECHOUEE = "ECHOUEE"
    IGNOREE = "IGNOREE"
    LUE = "LUE"
    TRAITEE = "TRAITEE"


# ============================================
# MODÈLES PRINCIPAUX
# ============================================

class JournalAudit(BaseModel):
    """
    Modèle pour les journaux d'audit
    Correspond à l'entité AuditLog de Spring Boot
    """
    id: Optional[str] = Field(None, description="Identifiant unique du log")
    typeEvenement: TypeEvenement = Field(..., description="Type d'événement")
    horodatage: datetime = Field(default_factory=datetime.now, description="Date et heure de l'événement")
    
    # Informations utilisateur
    idUtilisateur: Optional[int] = Field(None, description="ID de l'utilisateur")
    emailUtilisateur: Optional[str] = Field(None, description="Email de l'utilisateur")
    roleUtilisateur: Optional[str] = Field(None, description="Rôle de l'utilisateur")
    adresseIP: Optional[str] = Field(None, description="Adresse IP source")
    agentUtilisateur: Optional[str] = Field(None, description="User-Agent du navigateur")
    
    # Informations document
    idDocument: Optional[int] = Field(None, description="ID du document concerné")
    nomDocument: Optional[str] = Field(None, description="Nom du document")
    typeSignature: Optional[str] = Field(None, description="Type de signature (simple, pki, auto)")
    
    # Statut et détails
    statut: str = Field(..., description="Statut (SUCCESS, FAILED, PENDING)")
    details: Optional[str] = Field(None, description="Détails supplémentaires")
    jeton: Optional[str] = Field(None, description="Jeton d'invitation")
    
    @field_validator('emailUtilisateur')
    @classmethod
    def valider_email(cls, v: Optional[str]) -> Optional[str]:
        """Valide le format de l'email"""
        if v is not None and '@' not in v:
            raise ValueError('Email invalide')
        return v
    
    @field_validator('adresseIP')
    @classmethod
    def valider_ip(cls, v: Optional[str]) -> Optional[str]:
        """Validation basique de l'adresse IP"""
        if v is not None and v != 'unknown':
            parts = v.split('.')
            if len(parts) == 4:
                for part in parts:
                    if not part.isdigit() or int(part) < 0 or int(part) > 255:
                        return v  # On ne bloque pas, juste on note
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "typeEvenement": "SIGNATURE_DOCUMENT",
                "horodatage": "2024-01-15T10:30:00",
                "emailUtilisateur": "user@example.com",
                "statut": "SUCCESS"
            }
        }


class ResultatAnomalie(BaseModel):
    """Résultat de détection d'anomalie"""
    id_journal: Optional[str] = Field(None, description="ID du journal concerné")
    horodatage: datetime = Field(default_factory=datetime.now, description="Date de détection")
    type_anomalie: TypeAnomalie = Field(..., description="Type d'anomalie détectée")
    niveau_risque: NiveauRisque = Field(..., description="Niveau de risque")
    score_anomalie: float = Field(..., ge=0, le=1, description="Score de 0 à 1")
    explication: str = Field(..., description="Explication de l'anomalie")
    
    email_utilisateur: Optional[str] = Field(None, description="Email de l'utilisateur concerné")
    adresse_ip: Optional[str] = Field(None, description="Adresse IP associée")
    type_evenement: Optional[str] = Field(None, description="Type d'événement original")
    statut: Optional[str] = Field(None, description="Statut de l'événement")
    regles_metier_violees: List[str] = Field(default_factory=list, description="Règles métier violées")
    details: Optional[str] = Field(None, description="Détails supplémentaires")
    
    @field_validator('score_anomalie')
    @classmethod
    def valider_score(cls, v: float) -> float:
        """Valide que le score est entre 0 et 1"""
        if v < 0 or v > 1:
            raise ValueError('Le score doit être compris entre 0 et 1')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "type_anomalie": "TENTATIVE_CONNEXION_ECHOUEE",
                "niveau_risque": "ELEVE",
                "score_anomalie": 0.85,
                "explication": "5 tentatives de connexion échouées en 5 minutes"
            }
        }


class ScoreRisqueUtilisateur(BaseModel):
    """Score de risque pour un utilisateur"""
    email_utilisateur: str = Field(..., description="Email de l'utilisateur")
    score_risque: float = Field(..., ge=0, le=1, description="Score global de 0 à 1")
    niveau_risque: NiveauRisque = Field(..., description="Niveau de risque")
    facteurs: Dict[str, float] = Field(default_factory=dict, description="Détail des facteurs")
    
    total_evenements: int = Field(0, description="Nombre total d'événements")
    premier_evenement: Optional[datetime] = Field(None, description="Date du premier événement")
    dernier_evenement: Optional[datetime] = Field(None, description="Date du dernier événement")
    
    metriques: Dict[str, Any] = Field(default_factory=dict, description="Métriques comportementales")
    recommandations: List[str] = Field(default_factory=list, description="Recommandations")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email_utilisateur": "user@example.com",
                "score_risque": 0.45,
                "niveau_risque": "MOYEN",
                "facteurs": {
                    "echecs_connexion": 0.3,
                    "horaires_inhabituels": 0.6
                }
            }
        }


class RapportAudit(BaseModel):
    """Rapport d'audit complet généré par l'IA"""
    id_rapport: str = Field(default_factory=lambda: f"AUDIT_{uuid.uuid4().hex[:8].upper()}")
    version: str = Field("1.0", description="Version du format de rapport")
    service: str = Field("Assistant d'Audit Intelligent", description="Nom du service")
    
    periode_debut: datetime = Field(..., description="Début de la période analysée")
    periode_fin: datetime = Field(..., description="Fin de la période analysée")
    genere_le: datetime = Field(default_factory=datetime.now, description="Date de génération")
    
    resume_executif: str = Field(..., description="Résumé exécutif")
    statistiques_globales: Dict[str, Any] = Field(default_factory=dict, description="Statistiques globales")
    analyse_temporelle: Dict[str, Any] = Field(default_factory=dict, description="Analyse temporelle")
    
    top_utilisateurs: List[Dict] = Field(default_factory=list, description="Utilisateurs les plus actifs")
    analyse_evenements: Dict[str, Any] = Field(default_factory=dict, description="Analyse par type d'événement")
    analyse_securite: Dict[str, Any] = Field(default_factory=dict, description="Analyse de sécurité")
    
    resume_anomalies: Optional[Dict[str, Any]] = Field(None, description="Résumé des anomalies")
    recommandations: List[str] = Field(default_factory=list, description="Recommandations")
    metriques_cles: Dict[str, Any] = Field(default_factory=dict, description="Métriques clés")
    
    annexes: Dict[str, Any] = Field(default_factory=dict, description="Annexes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id_rapport": "AUDIT_A1B2C3D4",
                "periode_debut": "2024-01-01T00:00:00",
                "periode_fin": "2024-01-31T23:59:59",
                "resume_executif": "Analyse de 1500 événements avec 12 anomalies détectées"
            }
        }


# ============================================
# MODÈLES DE CONFIGURATION
# ============================================

class ConfigurationAlertes(BaseModel):
    """Configuration des alertes"""
    actif: bool = Field(True, description="Activer les alertes")
    canaux: List[str] = Field(["console"], description="Canaux d'alerte actifs")
    
    # Seuils par niveau
    seuils: Dict[str, Dict[str, int]] = Field(
        default={
            "CRITIQUE": {"minute": 1, "heure": 5, "jour": 10},
            "ELEVE": {"minute": 3, "heure": 10, "jour": 25},
            "MOYEN": {"minute": 5, "heure": 20, "jour": 50},
            "FAIBLE": {"minute": 10, "heure": 50, "jour": 100}
        },
        description="Seuils de rate limiting"
    )
    
    # Configuration des canaux
    email: Optional[Dict[str, Any]] = Field(None, description="Configuration email")
    slack: Optional[Dict[str, Any]] = Field(None, description="Configuration Slack")
    webhook: Optional[Dict[str, Any]] = Field(None, description="Configuration webhook")
    telegram: Optional[Dict[str, Any]] = Field(None, description="Configuration Telegram")


class ConfigurationAnalyse(BaseModel):
    """Configuration de l'analyse IA"""
    # Détection anomalies
    contamination: float = Field(0.05, ge=0.01, le=0.2, description="Taux d'anomalies attendu")
    n_estimateurs: int = Field(100, ge=10, le=500, description="Nombre d'arbres")
    seuil_anomalie: float = Field(0.6, ge=0.3, le=0.9, description="Seuil de détection")
    
    # Scoring risque
    poids_facteurs: Dict[str, float] = Field(
        default={
            'echecs_connexion': 0.25,
            'echecs_signature': 0.20,
            'horaires_inhabituels': 0.15,
            'actions_rapides': 0.15,
            'anomalies_detectees': 0.15,
            'ip_inhabituelle': 0.10
        },
        description="Poids des facteurs de risque"
    )
    
    # Analyse temporelle
    fenetre_analyse_minutes: int = Field(5, ge=1, le=60, description="Fenêtre d'analyse pour pics")
    periode_analyse_jours: int = Field(30, ge=1, le=365, description="Période par défaut")
    
    # Performance
    taille_lot: int = Field(500, ge=10, le=5000, description="Taille des lots de traitement")
    intervalle_auto: int = Field(300, ge=60, le=3600, description="Intervalle analyse auto (secondes)")


# ============================================
# MODÈLES DE REQUÊTES/RÉPONSES API
# ============================================

class RequeteAnalyse(BaseModel):
    """Requête d'analyse d'audit"""
    date_debut: Optional[datetime] = Field(None, description="Date de début")
    date_fin: Optional[datetime] = Field(None, description="Date de fin")
    email_utilisateur: Optional[str] = Field(None, description="Filtrer par utilisateur")
    seuil_anomalie: Optional[float] = Field(None, ge=0, le=1, description="Seuil personnalisé")
    
    @field_validator('date_debut', 'date_fin')
    @classmethod
    def valider_dates(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """Validation des dates"""
        if v and info.field_name == 'date_fin' and info.data.get('date_debut'):
            if v < info.data['date_debut']:
                raise ValueError('date_fin doit être postérieure à date_debut')
        return v


class ReponseAnalyse(BaseModel):
    """Réponse d'analyse d'audit"""
    succes: bool = Field(True, description="Succès de l'opération")
    message: Optional[str] = Field(None, description="Message d'information")
    
    total_journaux: int = Field(0, description="Nombre de journaux analysés")
    nombre_anomalies: int = Field(0, description="Nombre d'anomalies détectées")
    niveau_risque_global: str = Field("INCONNU", description="Niveau de risque global")
    
    anomalies: List[ResultatAnomalie] = Field(default_factory=list, description="Anomalies détectées")
    pics_activite: List[Dict] = Field(default_factory=list, description="Pics d'activité")
    recommandations: List[str] = Field(default_factory=list, description="Recommandations")
    
    analyse_effectuee: datetime = Field(default_factory=datetime.now, description="Date de l'analyse")


class RequeteRapport(BaseModel):
    """Requête de génération de rapport"""
    date_debut: datetime = Field(..., description="Date de début")
    date_fin: datetime = Field(..., description="Date de fin")
    format: str = Field("json", pattern="^(json|pdf)$", description="Format du rapport")
    inclure_anomalies: bool = Field(True, description="Inclure les anomalies")
    inclure_recommandations: bool = Field(True, description="Inclure les recommandations")


class ReponseRapport(BaseModel):
    """Réponse de génération de rapport"""
    succes: bool = Field(True, description="Succès de l'opération")
    message: Optional[str] = Field(None, description="Message d'information")
    rapport: Optional[RapportAudit] = Field(None, description="Rapport généré")
    url_telechargement: Optional[str] = Field(None, description="URL de téléchargement (si PDF)")


# ============================================
# FONCTIONS UTILITAIRES
# ============================================

def convertir_journal_vers_dict(journal: JournalAudit) -> Dict[str, Any]:
    """
    Convertit un objet JournalAudit en dictionnaire
    Utile pour l'envoi à Spring Boot
    """
    return journal.model_dump(exclude_none=True)


def valider_journal_audit(data: Dict[str, Any]) -> bool:
    """
    Valide qu'un dictionnaire correspond au format JournalAudit
    """
    try:
        JournalAudit(**data)
        return True
    except Exception:
        return False


def creer_journal_depuis_spring(data: Dict[str, Any]) -> JournalAudit:
    """
    Crée un JournalAudit à partir des données de Spring Boot
    Gère la conversion des noms de champs
    """
    # Mapping des noms de champs Spring Boot -> Python
    mapping = {
        'id': 'id',
        'typeEvenement': 'typeEvenement',
        'timestamp': 'horodatage',  # Spring utilise timestamp
        'userId': 'idUtilisateur',
        'userEmail': 'emailUtilisateur',
        'userRole': 'roleUtilisateur',
        'ipAddress': 'adresseIP',
        'userAgent': 'agentUtilisateur',
        'documentId': 'idDocument',
        'documentName': 'nomDocument',
        'signatureType': 'typeSignature',
        'status': 'statut',
        'details': 'details',
        'token': 'jeton'
    }
    
    # Transformer les données
    transformed = {}
    for spring_key, python_key in mapping.items():
        if spring_key in data:
            transformed[python_key] = data[spring_key]
    
    return JournalAudit(**transformed)