# service_ia/services/calculateur_risque.py
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from collections import defaultdict, Counter
import logging

logger = logging.getLogger(__name__)

class CalculateurRisque:
    """
    Calcule des scores de risque pour les utilisateurs et les événements
    Basé sur l'analyse comportementale et l'historique
    """
    
    def __init__(self):
        # Poids des différents facteurs de risque
        self.poids_facteurs = {
            'echecs_connexion': 0.25,
            'echecs_signature': 0.20,
            'horaires_inhabituels': 0.15,
            'actions_rapides': 0.15,
            'anomalies_detectees': 0.15,
            'ip_inhabituelle': 0.10
        }
        
        # Seuils pour chaque niveau de risque
        self.seuils = {
            'CRITIQUE': 0.8,
            'ELEVE': 0.6,
            'MOYEN': 0.35,
            'FAIBLE': 0.0
        }
        
        # Périodes d'analyse
        self.periode_courte = 7    # jours
        self.periode_moyenne = 30   # jours
        self.periode_longue = 90    # jours
        
    def calculer_score_utilisateur(self, journaux_utilisateur: List[Dict]) -> Dict:
        """
        Calcule le score de risque pour un utilisateur spécifique
        """
        if not journaux_utilisateur:
            return {
                'score': 0.0,
                'niveau': 'INCONNU',
                'facteurs': {},
                'total_evenements': 0
            }
        
        # Trier par date
        journaux_utilisateur = sorted(
            journaux_utilisateur, 
            key=lambda x: x.get('horodatage', ''), 
            reverse=True
        )
        
        email = journaux_utilisateur[0].get('emailUtilisateur', 'Inconnu')
        
        # Calculer les différents facteurs
        facteurs = {}
        
        # 1. Échecs de connexion
        facteurs['echecs_connexion'] = self._calculer_taux_echecs_connexion(journaux_utilisateur)
        
        # 2. Échecs de signature
        facteurs['echecs_signature'] = self._calculer_taux_echecs_signature(journaux_utilisateur)
        
        # 3. Horaires inhabituels
        facteurs['horaires_inhabituels'] = self._calculer_score_horaires(journaux_utilisateur)
        
        # 4. Actions trop rapides
        facteurs['actions_rapides'] = self._calculer_score_actions_rapides(journaux_utilisateur)
        
        # 5. Anomalies dans l'historique
        facteurs['anomalies_detectees'] = self._calculer_score_anomalies_historique(journaux_utilisateur)
        
        # 6. IP inhabituelle
        facteurs['ip_inhabituelle'] = self._calculer_score_ip_inhabituelle(journaux_utilisateur)
        
        # Calculer le score global pondéré
        score_global = 0
        for facteur, valeur in facteurs.items():
            poids = self.poids_facteurs.get(facteur, 0.1)
            score_global += valeur * poids
        
        # Limiter entre 0 et 1
        score_global = min(1.0, max(0.0, score_global))
        
        # Déterminer le niveau de risque
        niveau = self._determiner_niveau_risque(score_global)
        
        # Générer des métriques supplémentaires
        metriques = self._calculer_metriques_comportementales(journaux_utilisateur)
        
        return {
            'email_utilisateur': email,
            'score': round(score_global, 3),
            'niveau': niveau,
            'facteurs': {k: round(v, 3) for k, v in facteurs.items()},
            'total_evenements': len(journaux_utilisateur),
            'premier_evenement': journaux_utilisateur[-1].get('horodatage') if journaux_utilisateur else None,
            'dernier_evenement': journaux_utilisateur[0].get('horodatage') if journaux_utilisateur else None,
            'metriques': metriques
        }
    
    def _calculer_taux_echecs_connexion(self, journaux: List[Dict]) -> float:
        """Calcule le taux d'échec des connexions"""
        connexions = [j for j in journaux if j.get('typeEvenement') == 'CONNEXION']
        if not connexions:
            return 0.0
        
        total = len(connexions)
        echecs = sum(1 for c in connexions if c.get('statut') == 'FAILED')
        
        taux = echecs / total if total > 0 else 0
        # Plus de 30% d'échecs = risque élevé
        return min(1.0, taux / 0.3)
    
    def _calculer_taux_echecs_signature(self, journaux: List[Dict]) -> float:
        """Calcule le taux d'échec des signatures"""
        signatures = [j for j in journaux if j.get('typeEvenement') == 'SIGNATURE_DOCUMENT']
        if not signatures:
            return 0.0
        
        total = len(signatures)
        echecs = sum(1 for s in signatures if s.get('statut') == 'FAILED')
        
        taux = echecs / total if total > 0 else 0
        return min(1.0, taux / 0.2)  # 20% d'échecs = risque élevé
    
    def _calculer_score_horaires(self, journaux: List[Dict]) -> float:
        """Calcule le score basé sur les horaires d'activité inhabituels"""
        if not journaux:
            return 0.0
        
        horaires_inhabituels = 0
        total = 0
        
        for journal in journaux:
            horodatage = journal.get('horodatage')
            if horodatage:
                try:
                    heure = datetime.fromisoformat(horodatage).hour
                    total += 1
                    # Heures inhabituelles: 00h-06h et 22h-24h
                    if heure < 6 or heure > 22:
                        horaires_inhabituels += 1
                except:
                    pass
        
        if total == 0:
            return 0.0
        
        proportion = horaires_inhabituels / total
        # Plus de 20% d'activité en horaires inhabituels = risque
        return min(1.0, proportion / 0.2)
    
    def _calculer_score_actions_rapides(self, journaux: List[Dict]) -> float:
        """Détecte les actions anormalement rapides (possible bot)"""
        if len(journaux) < 2:
            return 0.0
        
        actions_rapides = 0
        # Trier chronologiquement
        tries = sorted(journaux, key=lambda x: x.get('horodatage', ''))
        
        for i in range(1, len(tries)):
            t1 = tries[i-1].get('horodatage')
            t2 = tries[i].get('horodatage')
            
            if t1 and t2:
                try:
                    dt1 = datetime.fromisoformat(t1)
                    dt2 = datetime.fromisoformat(t2)
                    diff_secondes = (dt2 - dt1).total_seconds()
                    
                    # Moins de 2 secondes entre actions = suspect
                    if 0 < diff_secondes < 2:
                        actions_rapides += 1
                except:
                    pass
        
        total_paires = len(tries) - 1
        if total_paires == 0:
            return 0.0
        
        proportion = actions_rapides / total_paires
        return min(1.0, proportion / 0.1)  # 10% d'actions très rapides = risque
    
    def _calculer_score_anomalies_historique(self, journaux: List[Dict]) -> float:
        """Évalue les anomalies dans l'historique de l'utilisateur"""
        # Compter les événements avec statut FAILED
        echecs = sum(1 for j in journaux if j.get('statut') == 'FAILED')
        total = len(journaux)
        
        if total == 0:
            return 0.0
        
        taux_echec = echecs / total
        return min(1.0, taux_echec / 0.15)  # 15% d'échecs = risque
    
    def _calculer_score_ip_inhabituelle(self, journaux: List[Dict]) -> float:
        """Détecte les connexions depuis des IP inhabituelles"""
        if len(journaux) < 3:
            return 0.0
        
        # Compter les IP par utilisateur
        ips = [j.get('adresseIP') for j in journaux if j.get('adresseIP')]
        
        if not ips:
            return 0.0
        
        ip_principale = Counter(ips).most_common(1)[0][0]
        ip_principale_count = ips.count(ip_principale)
        
        # Si l'utilisateur utilise beaucoup d'IP différentes
        ips_uniques = len(set(ips))
        
        if ips_uniques <= 2:
            return 0.0
        
        # Plus de 3 IP différentes = suspect
        return min(1.0, (ips_uniques - 2) / 5)
    
    def _determiner_niveau_risque(self, score: float) -> str:
        """Détermine le niveau de risque à partir du score"""
        if score >= self.seuils['CRITIQUE']:
            return "CRITIQUE"
        elif score >= self.seuils['ELEVE']:
            return "ELEVE"
        elif score >= self.seuils['MOYEN']:
            return "MOYEN"
        else:
            return "FAIBLE"
    
    def _calculer_metriques_comportementales(self, journaux: List[Dict]) -> Dict:
        """Calcule des métriques comportementales détaillées"""
        if not journaux:
            return {}
        
        # Heure préférée
        heures = []
        for j in journaux:
            horodatage = j.get('horodatage')
            if horodatage:
                try:
                    heures.append(datetime.fromisoformat(horodatage).hour)
                except:
                    pass
        
        heure_preferee = Counter(heures).most_common(1)[0][0] if heures else None
        
        # Types d'événements préférés
        types = [j.get('typeEvenement') for j in journaux if j.get('typeEvenement')]
        type_prefere = Counter(types).most_common(1)[0][0] if types else None
        
        # Rythme d'activité (événements par jour)
        jours_activite = set()
        for j in journaux:
            horodatage = j.get('horodatage')
            if horodatage:
                try:
                    jours_activite.add(datetime.fromisoformat(horodatage).date())
                except:
                    pass
        
        jours_total = max(1, len(jours_activite))
        evenements_par_jour = len(journaux) / jours_total
        
        return {
            'heure_preferee': heure_preferee,
            'type_evenement_prefere': type_prefere,
            'evenements_par_jour': round(evenements_par_jour, 2),
        }
    
    def generer_recommandations(self, score_risque: Dict) -> List[str]:
        """Génère des recommandations personnalisées basées sur le score"""
        recommandations = []
        niveau = score_risque.get('niveau', 'FAIBLE')
        facteurs = score_risque.get('facteurs', {})
        
        if niveau == 'CRITIQUE':
            recommandations.append("🚨 ACTION IMMÉDIATE: Suspendre le compte et contacter l'utilisateur")
            recommandations.append("🔒 Réinitialiser le mot de passe et révoquer les sessions actives")
            recommandations.append("📞 Contacter le support sécurité pour investigation")
            
        elif niveau == 'ELEVE':
            recommandations.append("⚠️ Vérifier l'identité de l'utilisateur")
            recommandations.append("🔐 Forcer la réinitialisation du mot de passe")
            recommandations.append("📧 Envoyer une alerte de sécurité à l'utilisateur")
            
        elif niveau == 'MOYEN':
            recommandations.append("📊 Surveiller attentivement l'activité de cet utilisateur")
            recommandations.append("🔔 Activer des alertes renforcées")
        
        # Recommandations spécifiques par facteur
        if facteurs.get('echecs_connexion', 0) > 0.5:
            recommandations.append("🔑 Nombreuses tentatives de connexion échouées - Vérifier si l'utilisateur a oublié son mot de passe")
        
        if facteurs.get('actions_rapides', 0) > 0.5:
            recommandations.append("🤖 Actions trop rapides détectées - Vérifier l'utilisation d'automatisation")
        
        if facteurs.get('ip_inhabituelle', 0) > 0.5:
            recommandations.append("🌐 Connexions depuis multiples IP - Vérifier la légitimité")
        
        if not recommandations:
            recommandations.append("✅ Comportement normal - Surveillance standard maintenue")
            recommandations.append("📈 Continuer la surveillance régulière")
        
        return recommandations
    
    def evaluer_menace_temps_reel(self, evenement: Dict, historique: List[Dict]) -> Dict:
        """
        Évalue une menace en temps réel basée sur un événement et l'historique
        """
        score_immediat = 0.0
        alertes = []
        
        # Vérifier l'événement actuel
        type_event = evenement.get('typeEvenement')
        statut = evenement.get('statut')
        
        # Échec de connexion
        if type_event == 'CONNEXION' and statut == 'FAILED':
            # Compter les échecs récents
            maintenant = datetime.now()
            il_y_a_5_min = maintenant - timedelta(minutes=5)
            
            echecs_recents = sum(1 for h in historique 
                                if h.get('typeEvenement') == 'CONNEXION'
                                and h.get('statut') == 'FAILED'
                                and h.get('horodatage')
                                and datetime.fromisoformat(h['horodatage']) >= il_y_a_5_min)
            
            if echecs_recents >= 5:
                score_immediat = 0.9
                alertes.append("Tentatives de connexion multiples - Risque de brute force")
            elif echecs_recents >= 3:
                score_immediat = 0.7
                alertes.append("Tentatives de connexion répétées")
            else:
                score_immediat = 0.3
        
        # Signature rapide après connexion
        elif type_event == 'SIGNATURE_DOCUMENT':
            # Vérifier le temps depuis dernière connexion
            dernier_evenement = historique[0] if historique else None
            if dernier_evenement and dernier_evenement.get('typeEvenement') == 'CONNEXION':
                t1 = dernier_evenement.get('horodatage')
                t2 = evenement.get('horodatage')
                if t1 and t2:
                    try:
                        dt1 = datetime.fromisoformat(t1)
                        dt2 = datetime.fromisoformat(t2)
                        if (dt2 - dt1).total_seconds() < 10:
                            score_immediat = 0.4
                            alertes.append("Signature très rapide après connexion")
                    except:
                        pass
        
        return {
            'score_menace_immediate': round(score_immediat, 3),
            'niveau_alerte': 'ELEVE' if score_immediat > 0.7 else 'MOYEN' if score_immediat > 0.4 else 'INFO',
            'alertes': alertes,
            'action_recommandee': 'Bloquer temporairement' if score_immediat > 0.8 else 'Surveiller' if score_immediat > 0.5 else 'Autoriser'
        }