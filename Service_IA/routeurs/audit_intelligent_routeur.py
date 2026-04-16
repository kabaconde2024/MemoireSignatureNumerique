# service_ia/routeurs/audit_intelligent_routeur.py
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import requests
import logging
import os
from modeles.modeles_audit import JournalAudit, ResultatAnomalie, RapportAudit
from services.detecteur_anomalies import DetecteurAnomalies
from services.calculateur_risque import CalculateurRisque
from services.generateur_rapport_audit import GenerateurRapportAudit

# Désactiver les warnings SSL pour le développement
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)
routeur = APIRouter(prefix="/api/ia/audit", tags=["Audit Intelligent"])

# ============================================
# CONFIGURATION SPRING BOOT
# ============================================
SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "https://localhost:8443")
SPRING_BOOT_API_KEY = os.getenv("SPRING_BOOT_API_KEY", "trustsign-secret-key-2024")
VERIFY_SSL = os.getenv("SPRING_BOOT_VERIFY_SSL", "false").lower() == "true"

# Headers pour l'authentification
HEADERS = {
    "X-API-Key": SPRING_BOOT_API_KEY,
    "Content-Type": "application/json"
}

logger.info(f"🔧 Configuration Spring Boot: URL={SPRING_BOOT_URL}, VERIFY_SSL={VERIFY_SSL}")

# ============================================
# INITIALISATION DES SERVICES
# ============================================
detecteur_anomalies = DetecteurAnomalies()
calculateur_risque = CalculateurRisque()
generateur_rapport = GenerateurRapportAudit()


# ============================================
# FONCTIONS UTILITAIRES
# ============================================
def envoyer_anomalies_vers_spring(anomalies: List[Dict]):
    """Envoie les anomalies détectées à Spring Boot pour stockage"""
    try:
        response = requests.post(
            f"{SPRING_BOOT_URL}/api/ia/anomalies",
            json={"anomalies": anomalies, "timestamp": datetime.now().isoformat()},
            headers=HEADERS,
            timeout=10,
            verify=VERIFY_SSL
        )
        if response.status_code == 200:
            logger.info(f"✅ {len(anomalies)} anomalies envoyées à Spring Boot")
        else:
            logger.warning(f"⚠️ Réponse Spring Boot: {response.status_code}")
    except Exception as e:
        logger.error(f"❌ Erreur envoi anomalies: {e}")


def envoyer_rapport_vers_spring(rapport: Dict):
    """Envoie le rapport généré à Spring Boot"""
    try:
        response = requests.post(
            f"{SPRING_BOOT_URL}/api/ia/rapports",
            json=rapport,
            headers=HEADERS,
            timeout=10,
            verify=VERIFY_SSL
        )
        if response.status_code == 200:
            logger.info(f"✅ Rapport {rapport.get('id_rapport')} envoyé à Spring Boot")
    except Exception as e:
        logger.error(f"❌ Erreur envoi rapport: {e}")


def generer_recommandations(anomalies: List, niveau_risque: str) -> List[str]:
    """Génère des recommandations basées sur les anomalies détectées"""
    recommandations = []
    
    if niveau_risque in ["ELEVE", "CRITIQUE"]:
        recommandations.append("⚠️ Audit de sécurité immédiat recommandé")
        recommandations.append("🔒 Vérifier les accès et les permissions des utilisateurs")
    
    if len(anomalies) > 0:
        types_anomalies = set(a.get('type_anomalie', '') for a in anomalies)
        
        if "TENTATIVE_CONNEXION_ECHOUEE" in types_anomalies:
            recommandations.append("🔐 Activer la vérification en deux étapes pour les comptes concernés")
        
        if "HORAIRE_INHABITUEL" in types_anomalies:
            recommandations.append("⏰ Configurer des alertes pour les connexions hors horaires")
        
        if "ÉCHEC_RÉPÉTÉ" in types_anomalies:
            recommandations.append("🛡️ Vérifier les tentatives d'accès suspectes")
    
    if not recommandations:
        recommandations.append("✅ Aucune anomalie majeure détectée. Surveillance continue recommandée.")
    
    return recommandations


# ============================================
# ENDPOINTS API
# ============================================

@routeur.get("/journaux")
async def obtenir_journaux_audit(
    date_debut: Optional[datetime] = Query(None, description="Date de début"),
    date_fin: Optional[datetime] = Query(None, description="Date de fin"),
    email_utilisateur: Optional[str] = Query(None, description="Filtrer par email"),
    limite: int = Query(100, le=1000, description="Nombre maximum de logs")
):
    """
    Récupère les journaux d'audit depuis Spring Boot
    Utilise l'endpoint public avec clé API
    """
    params = {}
    if date_debut:
        params["startDate"] = date_debut.isoformat()
    if date_fin:
        params["endDate"] = date_fin.isoformat()
    if email_utilisateur:
        params["userEmail"] = email_utilisateur
    params["limit"] = limite
    
    try:
        logger.info(f"📡 Appel Spring Boot: {SPRING_BOOT_URL}/api/ia/logs/public")
        
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/logs/public",
            params=params,
            headers=HEADERS,
            timeout=30,
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        
        data = response.json()
        journaux = data.get("logs", [])
        
        logger.info(f"✅ {len(journaux)} journaux récupérés depuis Spring Boot")
        
        return {
            "total": len(journaux),
            "journaux": journaux,
            "periode": {
                "debut": date_debut.isoformat() if date_debut else "tous",
                "fin": date_fin.isoformat() if date_fin else "tous"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except requests.exceptions.ConnectionError as e:
        logger.error(f"❌ Connexion impossible à Spring Boot: {e}")
        raise HTTPException(
            status_code=503, 
            detail={
                "error": "Service Spring Boot indisponible",
                "message": "Vérifiez que Spring Boot est démarré sur le port 8443",
                "url": SPRING_BOOT_URL
            }
        )
    except requests.RequestException as e:
        logger.error(f"❌ Erreur Spring Boot: {e}")
        raise HTTPException(status_code=503, detail=f"Service Spring Boot indisponible: {str(e)}")


@routeur.get("/anomalies")
async def detecter_anomalies(
    date_debut: Optional[datetime] = Query(None, description="Date de début"),
    date_fin: Optional[datetime] = Query(None, description="Date de fin"),
    taches_fond: BackgroundTasks = None
):
    """
    Détecte les anomalies dans les journaux d'audit
    """
    params = {}
    if date_debut:
        params["startDate"] = date_debut.isoformat()
    if date_fin:
        params["endDate"] = date_fin.isoformat()
    
    try:
        # Récupérer les journaux
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/logs/public",
            params=params,
            headers=HEADERS,
            timeout=30,
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        
        data = response.json()
        journaux = data.get("logs", [])
        
        if not journaux:
            return {
                "success": True,
                "message": "Aucun journal trouvé pour la période spécifiée",
                "total_journaux": 0,
                "nombre_anomalies": 0,
                "anomalies": []
            }
        
        logger.info(f"📊 Analyse de {len(journaux)} journaux d'audit")
        
        # Entraîner le modèle si suffisamment de données
        if len(journaux) >= 10:
            detecteur_anomalies.entrainer(journaux)
        
        # Détecter les anomalies
        anomalies = detecteur_anomalies.detecter(journaux)
        
        # Détecter les pics d'activité anormaux
        pics_anormaux = detecteur_anomalies.detecter_pics_activite(journaux)
        
        # Envoyer les anomalies à Spring Boot en arrière-plan
        if taches_fond and anomalies:
            taches_fond.add_task(envoyer_anomalies_vers_spring, anomalies)
        
        # Calculer le niveau de risque global
        if len(anomalies) > 10:
            niveau_risque_global = "CRITIQUE"
            couleur = "🔴"
        elif len(anomalies) > 5:
            niveau_risque_global = "ELEVE"
            couleur = "🟠"
        elif len(anomalies) > 2:
            niveau_risque_global = "MOYEN"
            couleur = "🟡"
        else:
            niveau_risque_global = "FAIBLE"
            couleur = "🟢"
        
        recommandations = generer_recommandations(anomalies, niveau_risque_global)
        
        return {
            "success": True,
            "analyse_effectuee": datetime.now().isoformat(),
            "total_journaux": len(journaux),
            "nombre_anomalies": len(anomalies),
            "niveau_risque_global": f"{couleur} {niveau_risque_global}",
            "anomalies": anomalies,
            "pics_activite_anormaux": pics_anormaux,
            "recommandations": recommandations
        }
        
    except requests.RequestException as e:
        logger.error(f"❌ Erreur: {e}")
        raise HTTPException(status_code=503, detail=f"Service Spring Boot indisponible: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Erreur interne: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@routeur.get("/utilisateur/risque/{email}")
async def obtenir_score_risque_utilisateur(
    email: str,
    jours: int = Query(30, ge=1, le=365, description="Période d'analyse en jours")
):
    """
    Calcule le score de risque pour un utilisateur spécifique
    """
    date_debut = datetime.now() - timedelta(days=jours)
    
    try:
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/logs/public",
            params={"startDate": date_debut.isoformat(), "userEmail": email},
            headers=HEADERS,
            timeout=30,
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        
        data = response.json()
        journaux = data.get("logs", [])
        
        if not journaux:
            return {
                "success": True,
                "email_utilisateur": email,
                "message": "Aucune activité trouvée pour cet utilisateur sur la période",
                "score_risque": 0,
                "niveau_risque": "INCONNU"
            }
        
        # Calculer le score de risque
        score_risque = calculateur_risque.calculer_score_utilisateur(journaux)
        
        # Générer des recommandations personnalisées
        recommandations = calculateur_risque.generer_recommandations(score_risque)
        
        return {
            "success": True,
            "email_utilisateur": email,
            "periode_analyse_jours": jours,
            "date_debut_analyse": date_debut.isoformat(),
            "total_evenements": len(journaux),
            "score_risque": score_risque["score"],
            "niveau_risque": score_risque["niveau"],
            "facteurs": score_risque["facteurs"],
            "recommandations": recommandations,
            "evenements_recents": journaux[:10]
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur calcul risque: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@routeur.get("/statistiques")
async def obtenir_statistiques_audit(
    date_debut: Optional[datetime] = Query(None, description="Date de début"),
    date_fin: Optional[datetime] = Query(None, description="Date de fin")
):
    """
    Obtenir des statistiques agrégées sur les logs d'audit
    """
    params = {}
    if date_debut:
        params["startDate"] = date_debut.isoformat()
    if date_fin:
        params["endDate"] = date_fin.isoformat()
    
    try:
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/logs/public",
            params=params,
            headers=HEADERS,
            timeout=30,
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        
        data = response.json()
        journaux = data.get("logs", [])
        
        if not journaux:
            return {"success": True, "total": 0, "statistiques": {}}
        
        # Statistiques globales
        stats = {
            "total_evenements": len(journaux),
            "par_type": {},
            "par_statut": {},
            "par_jour": {},
            "par_heure": {},
            "taux_succes": 0,
            "utilisateurs_uniques": len(set(j.get("emailUtilisateur") for j in journaux if j.get("emailUtilisateur"))),
            "documents_signes": 0,
            "signatures_pki": 0,
            "signatures_simples": 0
        }
        
        for journal in journaux:
            # Par type d'événement
            type_event = journal.get("typeEvenement", "INCONNU")
            stats["par_type"][type_event] = stats["par_type"].get(type_event, 0) + 1
            
            # Par statut
            statut = journal.get("statut", "INCONNU")
            stats["par_statut"][statut] = stats["par_statut"].get(statut, 0) + 1
            
            # Par jour
            if journal.get("horodatage"):
                jour = journal["horodatage"][:10]
                stats["par_jour"][jour] = stats["par_jour"].get(jour, 0) + 1
            
            # Compter les signatures
            if type_event == "SIGNATURE_DOCUMENT" and statut == "SUCCESS":
                stats["documents_signes"] += 1
                if journal.get("typeSignature") == "pki":
                    stats["signatures_pki"] += 1
                elif journal.get("typeSignature") == "simple":
                    stats["signatures_simples"] += 1
        
        # Calculer le taux de succès
        total = stats["total_evenements"]
        succes = stats["par_statut"].get("SUCCESS", 0)
        stats["taux_succes"] = round((succes / total) * 100, 2) if total > 0 else 0
        
        return {
            "success": True,
            "periode": {
                "debut": date_debut.isoformat() if date_debut else "début historique",
                "fin": date_fin.isoformat() if date_fin else "maintenant"
            },
            "statistiques": stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur statistiques: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@routeur.get("/rapport")
async def generer_rapport_audit(
    date_debut: datetime = Query(..., description="Date de début (obligatoire)"),
    date_fin: datetime = Query(..., description="Date de fin (obligatoire)"),
    taches_fond: BackgroundTasks = None
):
    """
    Génère un rapport d'audit complet avec analyse IA
    """
    try:
        # Récupérer les journaux
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/logs/public",
            params={
                "startDate": date_debut.isoformat(),
                "endDate": date_fin.isoformat()
            },
            headers=HEADERS,
            timeout=30,
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        
        data = response.json()
        journaux = data.get("logs", [])
        
        if not journaux:
            return {
                "success": False,
                "message": "Aucune donnée pour la période spécifiée",
                "periode": {"debut": date_debut.isoformat(), "fin": date_fin.isoformat()}
            }
        
        # Détecter les anomalies pour le rapport
        if len(journaux) >= 10:
            detecteur_anomalies.entrainer(journaux)
            anomalies = detecteur_anomalies.detecter(journaux)
        else:
            anomalies = []
        
        # Générer le rapport
        rapport = generateur_rapport.generer(
            journaux, 
            date_debut,
            date_fin,
            anomalies
        )
        
        # Envoyer le rapport à Spring Boot en arrière-plan
        if taches_fond:
            taches_fond.add_task(envoyer_rapport_vers_spring, rapport)
        
        return {
            "success": True,
            "rapport": rapport,
            "format": "json"
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur génération rapport: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@routeur.get("/health")
async def health_check():
    """
    Vérifie la santé du service et la connexion à Spring Boot
    """
    # Vérifier la connexion à Spring Boot
    spring_status = "unknown"
    try:
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/health",
            headers=HEADERS,
            timeout=5,
            verify=VERIFY_SSL
        )
        if response.status_code == 200:
            spring_status = "connected"
        else:
            spring_status = "error"
    except Exception as e:
        spring_status = f"disconnected: {str(e)[:50]}"
    
    return {
        "status": "healthy",
        "service": "audit-intelligent-routeur",
        "timestamp": datetime.now().isoformat(),
        "spring_boot": {
            "url": SPRING_BOOT_URL,
            "status": spring_status
        },
        "modeles": {
            "anomalies_entraine": detecteur_anomalies.est_entraine,
            "version": "1.0.0"
        }
    }