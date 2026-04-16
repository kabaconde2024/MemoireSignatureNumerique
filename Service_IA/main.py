# Service_IA/main.py (version Render)
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional
import requests
import urllib3
import os
import logging

# Désactiver les warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TrustSign - Service IA")

# CORS pour permettre l'accès depuis votre frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://memoiresignaturenumerique.onrender.com",
        "https://votre-frontend.onrender.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration Spring Boot (hébergé sur Render)
SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "https://memoiresignaturenumerique.onrender.com")
SPRING_BOOT_API_KEY = os.getenv("SPRING_BOOT_API_KEY", "trustsign-secret-key-2024")
VERIFY_SSL = os.getenv("SPRING_BOOT_VERIFY_SSL", "false").lower() == "true"

HEADERS = {
    "X-API-Key": SPRING_BOOT_API_KEY,
    "Content-Type": "application/json"
}

# Import du routeur chatbot
from routeurs.chatbot_routeur import router
app.include_router(router)

# ============================================
# ENDPOINTS POUR L'AUDIT (inchangés)
# ============================================

def get_logs_from_spring(start_date=None, end_date=None, limit=5000):
    """Récupère les logs depuis Spring Boot"""
    try:
        params = {"limit": limit}
        if start_date:
            params["startDate"] = start_date.isoformat()
        if end_date:
            params["endDate"] = end_date.isoformat()
        
        response = requests.get(
            f"{SPRING_BOOT_URL}/api/ia/logs/public",
            params=params,
            headers=HEADERS,
            timeout=30,
            verify=VERIFY_SSL
        )
        
        if response.status_code == 200:
            data = response.json()
            logs = data.get("logs", [])
            logger.info(f"Récupéré {len(logs)} logs")
            return logs
        return []
    except Exception as e:
        logger.error(f"Erreur Spring Boot: {e}")
        return []

@app.get("/health")
def health():
    return {"status": "healthy", "service": "TrustSign IA"}

@app.get("/api/audit/statistiques")
def get_statistiques(periode: str = Query("semaine")):
    """Statistiques formatées pour le frontend React"""
    end_date = datetime.now()
    if periode == "jour":
        start_date = end_date - timedelta(days=1)
    elif periode == "semaine":
        start_date = end_date - timedelta(days=7)
    else:
        start_date = end_date - timedelta(days=30)
    
    logs = get_logs_from_spring(start_date, end_date, limit=5000)
    
    if not logs:
        return {
            "total_evenements": 0,
            "taux_succes": 0,
            "utilisateurs_actifs": 0,
            "documents_signes": 0,
            "signatures_pki": 0,
            "signatures_simples": 0,
            "echecs": 0,
            "par_type": {}
        }
    
    total = len(logs)
    succes = 0
    echecs = 0
    utilisateurs = set()
    documents_signes = 0
    signatures_pki = 0
    signatures_simples = 0
    par_type = {}
    
    for log in logs:
        email = log.get("emailUtilisateur")
        if email and email != "unknown":
            utilisateurs.add(email)
        
        status = log.get("statut")
        if status == "SUCCESS":
            succes += 1
        elif status == "FAILED":
            echecs += 1
        
        event_type = log.get("typeEvenement")
        if event_type:
            par_type[event_type] = par_type.get(event_type, 0) + 1
        
        if event_type == "SIGNATURE_DOCUMENT" and status == "SUCCESS":
            documents_signes += 1
            signature_type = log.get("typeSignature")
            if signature_type == "PKI":
                signatures_pki += 1
            elif signature_type == "SIMPLE" or signature_type == "AUTO":
                signatures_simples += 1
    
    taux_succes = round((succes / total) * 100, 2) if total > 0 else 0
    
    return {
        "total_evenements": total,
        "taux_succes": taux_succes,
        "utilisateurs_actifs": len(utilisateurs),
        "documents_signes": documents_signes,
        "signatures_pki": signatures_pki,
        "signatures_simples": signatures_simples,
        "echecs": echecs,
        "par_type": par_type
    }

@app.get("/api/audit/anomalies")
def get_anomalies(jours: int = Query(7)):
    """Anomalies formatées pour le frontend React"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=jours)
    
    logs = get_logs_from_spring(start_date, end_date, limit=5000)
    
    anomalies = []
    
    if logs:
        echecs_par_utilisateur = {}
        for log in logs:
            status = log.get("statut")
            if status == "FAILED":
                email = log.get("emailUtilisateur")
                if email:
                    echecs_par_utilisateur[email] = echecs_par_utilisateur.get(email, 0) + 1
        
        for email, count in echecs_par_utilisateur.items():
            if count >= 2:
                anomalies.append({
                    "id": f"anom_{email.replace('@', '_').replace('.', '_')}",
                    "type": "ACTIVITE_SUSPECTE",
                    "severite": "ELEVE" if count >= 5 else "MOYEN",
                    "utilisateur": email,
                    "description": f"{count} actions échouées en {jours} jours",
                    "date": datetime.now().isoformat()
                })
    
    return {
        "anomalies": anomalies,
        "total": len(anomalies)
    }

@app.get("/api/audit/resume-journalier")
def get_resume_journalier():
    """Résumé journalier formaté pour le frontend React"""
    today = datetime.now().date()
    start_date = datetime.combine(today, datetime.min.time())
    end_date = datetime.combine(today, datetime.max.time())
    
    logs = get_logs_from_spring(start_date, end_date, limit=1000)
    
    if not logs:
        return {
            "date": today.isoformat(),
            "total_evenements": 0,
            "taux_succes": 0,
            "anomalies": 0,
            "utilisateurs_actifs": 0,
            "signatures": 0,
            "succes": 0,
            "echecs": 0
        }
    
    total = len(logs)
    succes = 0
    echecs = 0
    utilisateurs = set()
    signatures = 0
    
    for log in logs:
        status = log.get("statut")
        if status == "SUCCESS":
            succes += 1
        elif status == "FAILED":
            echecs += 1
        
        email = log.get("emailUtilisateur")
        if email and email != "unknown":
            utilisateurs.add(email)
        
        event_type = log.get("typeEvenement")
        if event_type == "SIGNATURE_DOCUMENT":
            signatures += 1
    
    taux_succes = round((succes / total) * 100, 2) if total > 0 else 0
    
    return {
        "date": today.isoformat(),
        "total_evenements": total,
        "taux_succes": taux_succes,
        "anomalies": echecs,
        "utilisateurs_actifs": len(utilisateurs),
        "signatures": signatures,
        "succes": succes,
        "echecs": echecs
    }

@app.get("/api/ia/audit/journaux")
def get_journaux_audit(
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    limite: int = Query(100)
):
    """Récupère les journaux d'audit détaillés"""
    start_date = None
    end_date = None
    
    if date_debut:
        start_date = datetime.fromisoformat(date_debut)
    if date_fin:
        end_date = datetime.fromisoformat(date_fin)
    
    logs = get_logs_from_spring(start_date, end_date, limit=limite)
    
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.get("id"),
            "typeEvenement": log.get("typeEvenement"),
            "horodatage": log.get("horodatage"),
            "emailUtilisateur": log.get("emailUtilisateur"),
            "roleUtilisateur": log.get("roleUtilisateur"),
            "statut": log.get("statut"),
            "details": log.get("details"),
            "typeSignature": log.get("typeSignature"),
            "nomDocument": log.get("nomDocument")
        })
    
    return {
        "total": len(formatted_logs),
        "journaux": formatted_logs,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)