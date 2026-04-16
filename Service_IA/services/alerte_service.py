# service_ia/services/alerte_service.py
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Callable
from collections import deque, defaultdict
import logging
import json
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class ServiceAlerte:
    """
    Service de gestion d'alertes temps réel pour les anomalies détectées
    """
    
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.alertes_envoyees = deque(maxlen=1000)  # Garder historique des 1000 dernières alertes
        self.seuils = {
            'CRITIQUE': {'minute': 1, 'heure': 5, 'jour': 10},
            'ELEVE': {'minute': 3, 'heure': 10, 'jour': 25},
            'MOYEN': {'minute': 5, 'heure': 20, 'jour': 50},
            'FAIBLE': {'minute': 10, 'heure': 50, 'jour': 100}
        }
        
        # Configuration des canaux d'alerte
        self.canaux = {
            'email': self._envoyer_email,
            'webhook': self._envoyer_webhook,
            'console': self._envoyer_console,
            'slack': self._envoyer_slack,
            'telegram': self._envoyer_telegram
        }
        
        self.canaux_actifs = self.config.get('canaux_actifs', ['console', 'email'])
        
        logger.info("📢 Service d'alertes initialisé")
    
    def envoyer_alerte(self, anomalie: Dict, niveau: str = None) -> bool:
        """
        Envoie une alerte pour une anomalie détectée
        Retourne True si l'alerte a été envoyée
        """
        niveau = niveau or anomalie.get('niveau_risque', 'MOYEN')
        
        # Vérifier le rate limiting
        if not self._verifier_rate_limiting(anomalie, niveau):
            logger.debug(f"Rate limiting: Alerte ignorée pour {anomalie.get('email_utilisateur')}")
            return False
        
        # Construire le message d'alerte
        message = self._construire_message_alerte(anomalie, niveau)
        
        # Envoyer via les canaux actifs
        succes = False
        for canal in self.canaux_actifs:
            if canal in self.canaux:
                try:
                    if self.canaux[canal](message, anomalie):
                        logger.info(f"✅ Alerte envoyée via {canal}: {anomalie.get('type_anomalie')}")
                        succes = True
                except Exception as e:
                    logger.error(f"❌ Erreur envoi via {canal}: {e}")
        
        # Enregistrer l'alerte
        self.alertes_envoyees.append({
            'timestamp': datetime.now().isoformat(),
            'anomalie': anomalie,
            'niveau': niveau,
            'message': message,
            'succes': succes
        })
        
        return succes
    
    def envoyer_alerte_massive(self, anomalies: List[Dict]) -> Dict:
        """
        Envoie un résumé d'alertes pour plusieurs anomalies
        """
        if not anomalies:
            return {'total': 0, 'envoyees': 0}
        
        # Grouper par niveau
        par_niveau = defaultdict(list)
        for a in anomalies:
            niveau = a.get('niveau_risque', 'MOYEN')
            par_niveau[niveau].append(a)
        
        rapport = {
            'total': len(anomalies),
            'par_niveau': {k: len(v) for k, v in par_niveau.items()},
            'timestamp': datetime.now().isoformat(),
            'resume': self._generer_resume_alertes(anomalies)
        }
        
        # Envoyer le résumé pour les niveaux critiques et élevés
        if par_niveau.get('CRITIQUE') or par_niveau.get('ELEVE'):
            message_resume = self._construire_message_resume(rapport)
            
            for canal in self.canaux_actifs:
                if canal in self.canaux:
                    try:
                        self.canaux[canal](message_resume, {'type': 'RESUME_MASSIF', 'rapport': rapport})
                    except Exception as e:
                        logger.error(f"Erreur envoi résumé via {canal}: {e}")
        
        return rapport
    
    def _verifier_rate_limiting(self, anomalie: Dict, niveau: str) -> bool:
        """
        Vérifie si l'alerte doit être envoyée (rate limiting)
        """
        seuils_niveau = self.seuils.get(niveau, self.seuils['MOYEN'])
        
        # Clé unique pour cette source d'anomalie
        cle = f"{anomalie.get('email_utilisateur')}_{anomalie.get('type_anomalie')}"
        
        maintenant = datetime.now()
        minute_avant = maintenant - timedelta(minutes=1)
        heure_avant = maintenant - timedelta(hours=1)
        jour_avant = maintenant - timedelta(days=1)
        
        # Compter les alertes récentes pour cette clé
        alertes_recentes = [
            a for a in self.alertes_envoyees
            if a.get('anomalie', {}).get('email_utilisateur') == anomalie.get('email_utilisateur')
            and a.get('anomalie', {}).get('type_anomalie') == anomalie.get('type_anomalie')
        ]
        
        alertes_minute = sum(1 for a in alertes_recentes 
                            if datetime.fromisoformat(a['timestamp']) >= minute_avant)
        alertes_heure = sum(1 for a in alertes_recentes 
                           if datetime.fromisoformat(a['timestamp']) >= heure_avant)
        alertes_jour = sum(1 for a in alertes_recentes 
                          if datetime.fromisoformat(a['timestamp']) >= jour_avant)
        
        # Vérifier les limites
        if alertes_minute >= seuils_niveau['minute']:
            return False
        if alertes_heure >= seuils_niveau['heure']:
            return False
        if alertes_jour >= seuils_niveau['jour']:
            return False
        
        return True
    
    def _construire_message_alerte(self, anomalie: Dict, niveau: str) -> Dict:
        """Construit le message d'alerte à envoyer"""
        niveau_emoji = {
            'CRITIQUE': '🚨',
            'ELEVE': '⚠️',
            'MOYEN': '⚡',
            'FAIBLE': 'ℹ️'
        }
        
        return {
            'titre': f"{niveau_emoji.get(niveau, '📢')} Alerte {niveau} - {anomalie.get('type_anomalie')}",
            'niveau': niveau,
            'horodatage': datetime.now().isoformat(),
            'contenu': {
                'utilisateur': anomalie.get('email_utilisateur'),
                'type_evenement': anomalie.get('type_evenement'),
                'explication': anomalie.get('explication'),
                'score': anomalie.get('score_anomalie'),
                'adresse_ip': anomalie.get('adresse_ip'),
                'details': anomalie.get('details', '')
            },
            'action_recommandee': self._recommander_action(anomalie, niveau)
        }
    
    def _construire_message_resume(self, rapport: Dict) -> Dict:
        """Construit un message résumé pour les alertes massives"""
        return {
            'titre': "📊 Résumé des alertes d'audit",
            'type': 'RESUME_MASSIF',
            'horodatage': datetime.now().isoformat(),
            'contenu': {
                'total_anomalies': rapport['total'],
                'repartition': rapport['par_niveau'],
                'resume': rapport['resume']
            }
        }
    
    def _recommander_action(self, anomalie: Dict, niveau: str) -> str:
        """Recommande une action basée sur l'anomalie et son niveau"""
        if niveau == 'CRITIQUE':
            return "🔴 ACTION IMMÉDIATE: Bloquer l'utilisateur et contacter le support sécurité"
        elif niveau == 'ELEVE':
            return "🟠 Vérifier immédiatement l'activité suspecte"
        elif niveau == 'MOYEN':
            return "🟡 Surveiller attentivement dans les prochaines heures"
        else:
            return "🟢 Noter pour information, aucune action immédiate requise"
    
    def _generer_resume_alertes(self, anomalies: List[Dict]) -> str:
        """Génère un résumé textuel des alertes"""
        types = defaultdict(int)
        for a in anomalies:
            types[a.get('type_anomalie', 'INCONNU')] += 1
        
        resume = f"{len(anomalies)} anomalies détectées. "
        resume += "Répartition: " + ", ".join([f"{k}: {v}" for k, v in types.items()])
        return resume
    
    # === CANAUX D'ALERTE ===
    
    def _envoyer_console(self, message: Dict, anomalie: Dict) -> bool:
        """Affiche l'alerte dans la console"""
        print("\n" + "="*60)
        print(f"🔔 ALERTE - {message.get('titre')}")
        print(f"   Heure: {message.get('horodatage')}")
        print(f"   Message: {message.get('contenu', {}).get('explication', 'N/A')}")
        print(f"   Action: {message.get('action_recommandee', 'N/A')}")
        print("="*60 + "\n")
        return True
    
    def _envoyer_email(self, message: Dict, anomalie: Dict) -> bool:
        """Envoie l'alerte par email"""
        config_email = self.config.get('email', {})
        
        if not config_email.get('enabled', False):
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = config_email.get('from', 'alerts@audit-system.com')
            msg['To'] = config_email.get('to', 'admin@example.com')
            msg['Subject'] = message.get('titre')
            
            corps = f"""
            Alerte d'Audit - {message.get('titre')}
            
            Heure: {message.get('horodatage')}
            Niveau: {message.get('niveau')}
            
            Détails:
            - Utilisateur: {message.get('contenu', {}).get('utilisateur')}
            - Type: {message.get('contenu', {}).get('type_evenement')}
            - Explication: {message.get('contenu', {}).get('explication')}
            - Score anomalie: {message.get('contenu', {}).get('score')}
            
            Action recommandée: {message.get('action_recommandee')}
            
            ---
            Assistant d'Audit Intelligent
            """
            
            msg.attach(MIMEText(corps, 'plain'))
            
            # Envoyer l'email (configuration SMTP à compléter)
            # server = smtplib.SMTP(config_email.get('smtp_server', 'localhost'), config_email.get('smtp_port', 25))
            # server.send_message(msg)
            # server.quit()
            
            logger.debug(f"Email envoyé à {config_email.get('to')}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur envoi email: {e}")
            return False
    
    def _envoyer_webhook(self, message: Dict, anomalie: Dict) -> bool:
        """Envoie l'alerte via un webhook HTTP"""
        config_webhook = self.config.get('webhook', {})
        
        if not config_webhook.get('url'):
            return False
        
        try:
            response = requests.post(
                config_webhook['url'],
                json=message,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Erreur webhook: {e}")
            return False
    
    def _envoyer_slack(self, message: Dict, anomalie: Dict) -> bool:
        """Envoie l'alerte sur Slack"""
        config_slack = self.config.get('slack', {})
        
        if not config_slack.get('webhook_url'):
            return False
        
        niveau_emoji = {
            'CRITIQUE': ':red_circle:',
            'ELEVE': ':orange_circle:',
            'MOYEN': ':yellow_circle:',
            'FAIBLE': ':information_source:'
        }
        
        slack_message = {
            'attachments': [{
                'color': 'danger' if anomalie.get('niveau_risque') in ['CRITIQUE', 'ELEVE'] else 'warning',
                'title': message.get('titre'),
                'text': message.get('contenu', {}).get('explication'),
                'fields': [
                    {'title': 'Utilisateur', 'value': message.get('contenu', {}).get('utilisateur'), 'short': True},
                    {'title': 'Type', 'value': message.get('contenu', {}).get('type_evenement'), 'short': True},
                    {'title': 'Score', 'value': str(message.get('contenu', {}).get('score')), 'short': True},
                ],
                'footer': 'Assistant d\'Audit Intelligent',
                'ts': int(datetime.now().timestamp())
            }]
        }
        
        try:
            response = requests.post(
                config_slack['webhook_url'],
                json=slack_message,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Erreur Slack: {e}")
            return False
    
    def _envoyer_telegram(self, message: Dict, anomalie: Dict) -> bool:
        """Envoie l'alerte sur Telegram"""
        config_telegram = self.config.get('telegram', {})
        
        if not config_telegram.get('bot_token') or not config_telegram.get('chat_id'):
            return False
        
        texte = f"""
🔔 *{message.get('titre')}*
📅 {message.get('horodatage')}
👤 {message.get('contenu', {}).get('utilisateur')}
📝 {message.get('contenu', {}).get('explication')}
🎯 Action: {message.get('action_recommandee', 'N/A')}
        """
        
        url = f"https://api.telegram.org/bot{config_telegram['bot_token']}/sendMessage"
        
        try:
            response = requests.post(
                url,
                json={
                    'chat_id': config_telegram['chat_id'],
                    'text': texte,
                    'parse_mode': 'Markdown'
                },
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Erreur Telegram: {e}")
            return False
    
    def obtenir_statistiques_alertes(self) -> Dict:
        """Retourne les statistiques des alertes envoyées"""
        if not self.alertes_envoyees:
            return {'total': 0, 'message': 'Aucune alerte envoyée'}
        
        total = len(self.alertes_envoyees)
        par_niveau = defaultdict(int)
        par_type = defaultdict(int)
        
        for alerte in self.alertes_envoyees:
            niveau = alerte.get('niveau', 'INCONNU')
            par_niveau[niveau] += 1
            
            type_anomalie = alerte.get('anomalie', {}).get('type_anomalie', 'INCONNU')
            par_type[type_anomalie] += 1
        
        return {
            'total': total,
            'par_niveau': dict(par_niveau),
            'par_type': dict(par_type),
            'derniere_alerte': self.alertes_envoyees[-1]['timestamp'] if self.alertes_envoyees else None
        }
    
    def configurer_canal(self, canal: str, configuration: Dict):
        """Configure un canal d'alerte"""
        self.config[canal] = configuration
        if canal not in self.canaux_actifs:
            self.canaux_actifs.append(canal)
        logger.info(f"Canal {canal} configuré")
    
    def activer_canal(self, canal: str):
        """Active un canal d'alerte"""
        if canal not in self.canaux_actifs and canal in self.canaux:
            self.canaux_actifs.append(canal)
            logger.info(f"Canal {canal} activé")
    
    def desactiver_canal(self, canal: str):
        """Désactive un canal d'alerte"""
        if canal in self.canaux_actifs:
            self.canaux_actifs.remove(canal)
            logger.info(f"Canal {canal} désactivé")