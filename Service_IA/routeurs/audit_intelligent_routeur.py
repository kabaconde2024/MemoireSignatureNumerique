# routeurs/audit_intelligent_routeur.py
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import requests
import logging
import os
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)
routeur = APIRouter(prefix="/api/ia/audit", tags=["Audit Intelligent"])

SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "https://trustsign-backend-3zsj.onrender.com")
SPRING_BOOT_API_KEY = os.getenv("SPRING_BOOT_API_KEY", "trustsign-secret-key-2024")
VERIFY_SSL = os.getenv("SPRING_BOOT_VERIFY_SSL", "false").lower() == "true"

HEADERS = {
    "X-API-Key": SPRING_BOOT_API_KEY,
    "Content-Type": "application/json"
}

@routeur.get("/journaux")
async def obtenir_journaux_audit(
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    email_utilisateur: Optional[str] = Query(None),
    limite: int = Query(100)
):
    """Récupère les journaux d'audit depuis Spring Boot"""
    params = {"limit": limite}
    if date_debut:
        params["startDate"] = date_debut
    if date_fin:
        params["endDate"] = date_fin
    if email_utilisateur:
        params["userEmail"] = email_utilisateur
    
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
        
        return {
            "total": data.get("total", 0),
            "journaux": data.get("logs", []),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erreur: {e}")
        return {"total": 0, "journaux": [], "error": str(e)}

@routeur.get("/anomalies")
async def detecter_anomalies(
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None)
):
    """Détecte les anomalies (version simplifiée)"""
    params = {}
    if date_debut:
        params["startDate"] = date_debut
    if date_fin:
        params["endDate"] = date_fin
    
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
        logs = data.get("logs", [])
        
        anomalies = []
        echecs_par_utilisateur = {}
        
        for log in logs:
            if log.get("statut") == "FAILED":
                email = log.get("emailUtilisateur")
                if email:
                    echecs_par_utilisateur[email] = echecs_par_utilisateur.get(email, 0) + 1
        
        for email, count in echecs_par_utilisateur.items():
            if count >= 2:
                anomalies.append({
                    "type_anomalie": "ACTIVITE_SUSPECTE",
                    "niveau_risque": "ELEVE" if count >= 5 else "MOYEN",
                    "email_utilisateur": email,
                    "description": f"{count} actions échouées",
                    "score_anomalie": min(0.9, count / 10)
                })
        
        return {
            "success": True,
            "total_journaux": len(logs),
            "nombre_anomalies": len(anomalies),
            "anomalies": anomalies
        }
    except Exception as e:
        logger.error(f"Erreur: {e}")
        return {"success": False, "error": str(e)}

@routeur.get("/statistiques")
async def obtenir_statistiques_audit(
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None)
):
    """Statistiques agrégées"""
    params = {}
    if date_debut:
        params["startDate"] = date_debut
    if date_fin:
        params["endDate"] = date_fin
    
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
        logs = data.get("logs", [])
        
        total = len(logs)
        succes = sum(1 for log in logs if log.get("statut") == "SUCCESS")
        echecs = total - succes
        utilisateurs = set(log.get("emailUtilisateur") for log in logs if log.get("emailUtilisateur"))
        
        par_type = {}
        for log in logs:
            event_type = log.get("typeEvenement", "AUTRE")
            par_type[event_type] = par_type.get(event_type, 0) + 1
        
        return {
            "total_evenements": total,
            "taux_succes": round((succes / total) * 100, 2) if total > 0 else 0,
            "utilisateurs_actifs": len(utilisateurs),
            "echecs": echecs,
            "par_type": par_type
        }
    except Exception as e:
        logger.error(f"Erreur: {e}")
        return {"total_evenements": 0, "error": str(e)}

@routeur.get("/health")
async def health_check():
    spring_status = "unknown"
    try:
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/health",
            headers=HEADERS,
            timeout=5,
            verify=VERIFY_SSL
        )
        spring_status = "connected" if response.status_code == 200 else "error"
    except Exception as e:
        spring_status = "disconnected"
    
    return {
        "status": "healthy",
        "spring_boot": {"url": SPRING_BOOT_URL, "status": spring_status}
    }