# service_ia/services/chatbot_service.py
import openai
from openai import OpenAI
import chromadb
from chromadb.utils import embedding_functions
import os
import logging
from typing import List, Dict, Any
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatbotService:
    """Service chatbot utilisant OpenAI GPT avec RAG optionnel"""
    
    def __init__(self):
        # Configuration OpenAI
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        if not self.api_key:
            logger.error("❌ OPENAI_API_KEY non trouvée dans .env")
            raise ValueError("OPENAI_API_KEY is required")
        
        self.client = OpenAI(api_key=self.api_key)
        logger.info("✅ Service OpenAI initialisé")
        
        # Initialiser RAG (optionnel)
        self.rag_enabled = os.getenv("RAG_ENABLED", "true").lower() == "true"
        if self.rag_enabled:
            self._init_rag()
        else:
            self.rag = None
    
    def _init_rag(self):
        """Initialise la base vectorielle RAG"""
        try:
            # Embedding function française
            self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="paraphrase-multilingual-MiniLM-L12-v2"
            )
            
            # Client Chroma
            self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
            
            # Collection
            try:
                self.collection = self.chroma_client.get_collection(
                    name="trustsign_knowledge",
                    embedding_function=self.embedding_fn
                )
                logger.info(f"✅ Base RAG chargée ({self.collection.count()} documents)")
            except:
                self.collection = self.chroma_client.create_collection(
                    name="trustsign_knowledge",
                    embedding_function=self.embedding_fn
                )
                self._load_knowledge_base()
                logger.info(f"✅ Base RAG créée ({self.collection.count()} documents)")
                
        except Exception as e:
            logger.warning(f"⚠️ RAG non disponible: {e}")
            self.rag_enabled = False
            self.rag = None
    
    def _load_knowledge_base(self):
        """Charge la base de connaissances"""
        
        documents = [
            {
                "id": "sig_simple",
                "title": "Signature simple (OTP)",
                "content": """
                La signature simple utilise un code OTP envoyé par SMS.
                Procédure:
                1. Recevoir une invitation par email
                2. Cliquer sur le lien sécurisé
                3. Visualiser le document
                4. Saisir le code OTP reçu par SMS
                5. Confirmer la signature
                
                Délai: Code OTP valable 5 minutes
                Valeur légale: Preuve électronique admissible
                """
            },
            {
                "id": "sig_pki",
                "title": "Signature avancée (PKI/HSM)",
                "content": """
                La signature avancée utilise un certificat numérique dans un HSM.
                Prérequis: Avoir un certificat actif
                Procédure:
                1. Recevoir l'invitation
                2. Cliquer sur "Signer avec certificat"
                3. Sélectionner le certificat
                4. Valider la signature
                
                Avantages: Valeur juridique maximale, non-répudiable
                Conformité: eIDAS, équivalent signature manuscrite
                """
            },
            {
                "id": "certificat_demande",
                "title": "Demander un certificat numérique",
                "content": """
                Étapes pour obtenir un certificat:
                1. Se connecter à son compte
                2. Aller dans "Mon profil" → "Certificat numérique"
                3. Cliquer sur "Demander un certificat"
                4. Attendre l'approbation admin (24-48h)
                5. Recevoir une notification d'activation
                
                Durée validité: 365 jours
                Notification: Email à chaque étape
                """
            },
            {
                "id": "invitation",
                "title": "Envoyer une invitation à signer",
                "content": """
                Procédure d'invitation:
                1. Télécharger le document (PDF max 10 Mo)
                2. Cliquer sur "Inviter à signer"
                3. Saisir l'email du signataire
                4. Choisir le type de signature (simple/avancée)
                5. Personnaliser le message (optionnel)
                6. Envoyer l'invitation
                
                Délai par défaut: 7 jours
                Suivi: Dans "Mes invitations"
                """
            },
            {
                "id": "mfa",
                "title": "Double authentification (MFA)",
                "content": """
                Activer la double authentification:
                1. Aller dans Paramètres → Sécurité
                2. Cliquer sur "Activer MFA"
                3. Installer Google Authenticator
                4. Scanner le QR code
                5. Saisir le code de validation
                
                Important: Sauvegarder les codes de récupération
                Sécurité renforcée: Protège contre les vols de mots de passe
                """
            },
            {
                "id": "mot_de_passe_oublie",
                "title": "Mot de passe oublié",
                "content": """
                Réinitialiser son mot de passe:
                1. Sur la page de connexion, cliquer "Mot de passe oublié"
                2. Saisir son adresse email
                3. Recevoir un lien de réinitialisation (valable 1h)
                4. Créer un nouveau mot de passe (12+ caractères)
                5. Se connecter avec le nouveau mot de passe
                
                Conseil: Utiliser un gestionnaire de mots de passe
                """
            },
            {
                "id": "legalite",
                "title": "Valeur légale eIDAS",
                "content": """
                Cadre légal de la signature électronique:
                - Règlement eIDAS (UE 910/2014)
                - Signature simple: Preuve électronique
                - Signature avancée: Équivalent manuscrite
                - Certificat qualifié: Plus haut niveau
                
                Utilisations:
                - Contrats: Signature avancée recommandée
                - Devis/Factures: Signature simple suffisante
                - Actes notariés: Hors scope
                """
            },
            {
                "id": "otp_non_recu",
                "title": "Problème code OTP non reçu",
                "content": """
                Solutions si le code OTP n'arrive pas:
                1. Vérifier le numéro de téléphone dans son profil
                2. S'assurer d'avoir du réseau
                3. Demander un nouveau code
                4. Vérifier les spams (si OTP email)
                5. Contacter le support si persiste
                
                Alternative: Demander un OTP par email
                """
            },
            {
                "id": "compte_bloque",
                "title": "Compte bloqué",
                "content": """
                Causes et solutions compte bloqué:
                Causes: Trop de tentatives, activité suspecte
                
                Solutions:
                1. Attendre 30 minutes (déblocage auto)
                2. Utiliser "Mot de passe oublié"
                3. Contacter son administrateur
                4. Contacter le support technique
                
                Prévention: Activer MFA, mot de passe fort
                """
            },
            {
                "id": "contact_support",
                "title": "Contacter le support",
                "content": """
                Moyens de contacter le support:
                Email: support@trustsign.com (réponse < 4h)
                Téléphone: +221 XX XXX XX XX (9h-18h)
                Chat: Disponible sur le site
                
                Urgence: urgent@trustsign.com
                
                Avant de contacter:
                - Avoir son identifiant
                - Captures d'écran du problème
                - Décrire précisément l'erreur
                """
            }
        ]
        
        try:
            for doc in documents:
                self.collection.add(
                    ids=[doc["id"]],
                    documents=[doc["content"]],
                    metadatas=[{"title": doc["title"], "id": doc["id"]}]
                )
            logger.info(f"✅ {len(documents)} documents chargés dans la base RAG")
        except Exception as e:
            logger.error(f"Erreur chargement RAG: {e}")
    
    def search_knowledge(self, query: str, top_k: int = 3) -> List[Dict]:
        """Recherche dans la base de connaissances"""
        if not self.rag_enabled:
            return []
        
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k
            )
            
            documents = []
            if results and results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    distance = results['distances'][0][i] if results['distances'] else 1.0
                    
                    documents.append({
                        "content": doc,
                        "title": metadata.get("title", "Document"),
                        "relevance": 1 - min(distance, 1.0)
                    })
            
            return documents
            
        except Exception as e:
            logger.error(f"Erreur recherche RAG: {e}")
            return []
    
    def generate_response(self, user_message: str, conversation_history: List[Dict] = None, user_role: str = None) -> Dict:
        """
        Génère une réponse avec OpenAI GPT et RAG
        Retourne: {response, sources, model_used}
        """
        
        # 1. Recherche RAG pour contexte
        context_docs = []
        context_text = ""
        
        if self.rag_enabled:
            context_docs = self.search_knowledge(user_message, top_k=2)
            if context_docs:
                context_text = "Informations de la documentation:\n\n"
                for doc in context_docs:
                    if doc['relevance'] > 0.5:
                        context_text += f"📄 {doc['title']}:\n{doc['content']}\n\n"
        
        # 2. Construire le message système
        system_prompt = f"""Tu es l'assistant officiel de TrustSign, une plateforme de signature électronique.

Règles importantes:
- Réponds de manière professionnelle, précise et chaleureuse en français
- Utilise les informations de la documentation fournie si disponible
- Propose des actions concrètes et claires
- Sois empathique en cas de problème technique
- Si tu ne sais pas, dis-le et propose de contacter le support

{context_text}

Domaines de compétence:
- Signature simple (OTP) et signature avancée (PKI)
- Certificats numériques et HSM
- Invitations à signer et suivi
- Sécurité (MFA, mot de passe)
- Conformité légale (eIDAS, RGPD)
- Résolution de problèmes courants
- Gestion des comptes

Rôle utilisateur: {user_role or 'utilisateur standard'}

Réponds de façon naturelle, utilise des émojis appropriés, et structure ta réponse."""
        
        # 3. Construire l'historique
        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            for msg in conversation_history[-6:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        messages.append({"role": "user", "content": user_message})
        
        # 4. Appel OpenAI
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content
            
            return {
                "response": answer,
                "sources": [{"title": d["title"], "relevance": d["relevance"]} for d in context_docs],
                "model_used": "openai",
                "confidence": 0.95
            }
            
        except Exception as e:
            logger.error(f"Erreur OpenAI: {e}")
            
            # Fallback
            return {
                "response": "❌ Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants ou contactez notre support à support@trustsign.com",
                "sources": [],
                "model_used": "fallback",
                "confidence": 0.0
            }

# Instance globale
chatbot_service = ChatbotService()