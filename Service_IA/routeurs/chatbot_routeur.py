# service_ia/routeurs/chatbot_routeur.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import logging
import os
import requests

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

# ============================================
# CONFIGURATION MISTRAL (API REST directe)
# ============================================
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "ZQfdOI3Q3Gwg2d7odgcg0Madaexee3qY")
MISTRAL_AVAILABLE = bool(MISTRAL_API_KEY)

if MISTRAL_AVAILABLE:
    logger.info("Mistral API configurée")

# ============================================
# MODÈLES DE DONNÉES
# ============================================
class MessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    conversation_history: Optional[List[Dict]] = None

class MessageResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    suggestions: List[str]
    model_used: str
    timestamp: str

# ============================================
# BASE DE CONNAISSANCES (FALLBACK)
# ============================================
KNOWLEDGE_BASE = {
    "signature_simple": {
        "keywords": ["signature simple", "otp", "code otp", "sms"],
        "response": """
[SIGNATURE SIMPLE - CODE OTP]

Procedure :
1. Recevez l'invitation par email
2. Cliquez sur le lien securise
3. Saisissez le code OTP recu par SMS
4. Confirmez la signature

Informations :
- Code valable : 5 minutes
- Lien valable : 7 jours
- Valeur legale : Preuve electronique admissible en justice
"""
    },
    "signature_avancee": {
        "keywords": ["signature avancée", "pki", "certificat", "hsm"],
        "response": """
[SIGNATURE AVANCEE - PKI/HSM]

Procedure :
1. Recevez l'invitation par email
2. Cliquez sur "Signer avec certificat"
3. Selectionnez votre certificat
4. Validez la signature

Avantages :
- Valeur juridique maximale
- Non-repudiable
- Conforme au reglement eIDAS
"""
    },
    "accueil": {
        "keywords": ["bonjour", "salut", "hello", "coucou"],
        "response": """
[ASSISTANT TRUSTSIGN]

Je suis l'assistant de la plateforme de signature electronique TrustSign.

Je peux vous aider sur les sujets suivants :
- Signature simple (code OTP)
- Signature avancee (certificat PKI)
- Invitations a signer
- Double authentification (MFA)
- Certificats numeriques
- Problemes techniques

Posez votre question.
"""
    },
    "inconnu": {
        "keywords": [],
        "response": """
[QUESTION NON RECONNUE]

Je n'ai pas bien compris votre question.

Exemples de questions que je peux traiter :
- Comment signer un document ?
- Je n'ai pas recu mon code OTP
- Comment obtenir un certificat ?
- Mon compte est bloque

Support : support@trustsign.com
"""
    }
}

def find_fallback_response(message: str) -> tuple:
    message_lower = message.lower().strip()
    
    best_score = 0
    best_key = None
    best_response = None
    
    for key, data in KNOWLEDGE_BASE.items():
        score = 0
        for keyword in data["keywords"]:
            if keyword in message_lower:
                score += 1
        if score > best_score:
            best_score = score
            best_key = key
            best_response = data["response"]
    
    if best_score >= 1:
        return best_response, best_key, min(best_score / 5, 1.0)
    
    return KNOWLEDGE_BASE["inconnu"]["response"], "inconnu", 0.3

async def get_mistral_response(request: MessageRequest):
    """Appel direct à l'API Mistral (sans bibliothèque)"""
    if not MISTRAL_AVAILABLE:
        return None
    
    try:
        url = "https://api.mistral.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "mistral-small-latest",
            "messages": [
                {
                    "role": "system",
                    "content": "Tu es l'assistant TrustSign. Reponds en francais, de maniere professionnelle et claire. N'utilise pas d'emojis."
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            reponse_texte = result["choices"][0]["message"]["content"]
            
            return MessageResponse(
                response=reponse_texte,
                intent="mistral_generated",
                confidence=0.92,
                suggestions=[
                    "Comment signer un document ?",
                    "Comment obtenir un certificat ?",
                    "Comment inviter à signer ?"
                ],
                model_used="mistral_ai",
                timestamp=datetime.now().isoformat()
            )
        else:
            logger.error(f"Erreur Mistral: {response.status_code}")
            return None
        
    except Exception as e:
        logger.error(f"Erreur Mistral: {e}")
        return None

@router.post("/message", response_model=MessageResponse)
async def send_message(request: MessageRequest):
    logger.info(f"Message: {request.message[:100]}...")
    
    if MISTRAL_AVAILABLE:
        mistral_response = await get_mistral_response(request)
        if mistral_response:
            logger.info("Reponse Mistral AI")
            return mistral_response
    
    logger.info("Fallback")
    response_text, intent, confidence = find_fallback_response(request.message)
    
    return MessageResponse(
        response=response_text,
        intent=intent,
        confidence=confidence,
        suggestions=[
            "Comment signer un document ?",
            "Comment obtenir un certificat ?",
            "Comment inviter à signer ?"
        ],
        model_used="fallback",
        timestamp=datetime.now().isoformat()
    )

@router.get("/suggestions")
async def get_suggestions():
    return {"suggestions": [
        "Comment signer un document ?",
        "Comment obtenir un certificat ?",
        "Comment inviter à signer ?",
        "Activer la double authentification"
    ]}

@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "chatbot",
        "mistral_available": MISTRAL_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }