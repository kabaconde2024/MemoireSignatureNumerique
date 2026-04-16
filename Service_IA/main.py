# Service_IA/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
import logging

# Configuration des logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création de l'application
app = FastAPI(
    title="TrustSign - Service IA",
    description="Audit intelligent et Chatbot pour signature électronique",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://memoiresignaturenumerique.onrender.com",
        "https://votre-frontend.onrender.com",
        "http://localhost:3000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# IMPORT DES ROUTEURS
# ============================================
from routeurs.audit_intelligent_routeur import routeur as audit_router
from routeurs.chatbot_routeur import router as chatbot_router

# Inclusion des routeurs
app.include_router(audit_router)
app.include_router(chatbot_router)

# ============================================
# ENDPOINTS GÉNÉRAUX
# ============================================
@app.get("/")
async def root():
    return {
        "service": "TrustSign - Service IA",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "audit": "/api/ia/audit",
            "chatbot": "/api/chatbot",
            "health": "/health"
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)