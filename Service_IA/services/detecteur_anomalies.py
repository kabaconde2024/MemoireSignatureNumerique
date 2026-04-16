# service_ia/services/detecteur_anomalies.py
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter, defaultdict
import logging
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class DetecteurAnomalies:
    """
    Détecteur d'anomalies basé sur Isolation Forest et analyse comportementale
    Permet de détecter des comportements suspects dans les logs d'audit
    """
    
    def __init__(self):
        self.foret_isolation = IsolationForest(
            contamination=0.05,           # 5% d'anomalies attendues
            random_state=42,              # Pour reproductibilité
            n_estimators=100,             # Nombre d'arbres
            max_samples='auto',           # Échantillonnage automatique
            bootstrap=False,              # Pas de bootstrap
            verbose=0
        )
        self.encodeurs = {}               # Pour encoder les variables catégorielles
        self.scaler = StandardScaler()    # Normalisation des features
        self.est_entraine = False
        self.seuil_anomalie = 0.6
        self.historique_scores = []       # Historique des scores pour suivi
        
        # Seuils pour différents types d'anomalies
        self.seuils_types = {
            'CONNEXION': {'max_failed_per_hour': 5, 'max_failed_per_day': 10},
            'SIGNATURE_DOCUMENT': {'max_per_hour': 20, 'max_failed': 3},
            'ENVOI_INVITATION': {'max_per_hour': 50, 'max_failed': 5},
            'GENERATION_CERTIFICAT': {'max_per_day': 10, 'max_failed': 2}
        }
        
    def _preparer_caracteristiques(self, journaux: List[Dict]) -> np.ndarray:
        """
        Convertit les logs en caractéristiques numériques pour le modèle
        """
        if not journaux:
            return np.array([])
            
        df = pd.DataFrame(journaux)
        
        # Convertir l'horodatage
        df['horodatage'] = pd.to_datetime(df['horodatage'])
        
        # === CARACTÉRISTIQUES TEMPORELLES ===
        df['heure'] = df['horodatage'].dt.hour
        df['minute'] = df['horodatage'].dt.minute
        df['jour_semaine'] = df['horodatage'].dt.dayofweek
        df['mois'] = df['horodatage'].dt.month
        df['est_weekend'] = df['jour_semaine'].isin([5, 6]).astype(int)
        df['est_nuit'] = df['heure'].between(0, 5).astype(int)  # 00h-05h suspect
        df['est_matin'] = df['heure'].between(5, 9).astype(int)
        df['est_travail'] = df['heure'].between(9, 18).astype(int)
        df['est_soir'] = df['heure'].between(18, 23).astype(int)
        
        # === CARACTÉRISTIQUES CATÉGORIELLES ENCODÉES ===
        colonnes_categorielles = ['typeEvenement', 'statut', 'typeSignature', 'roleUtilisateur']
        for col in colonnes_categorielles:
            if col in df.columns:
                if col not in self.encodeurs:
                    self.encodeurs[col] = LabelEncoder()
                    # Remplacer les NaN par 'INCONNU'
                    df[col] = df[col].fillna('INCONNU')
                    self.encodeurs[col].fit(df[col])
                else:
                    # Pour les nouvelles valeurs non vues
                    df[col] = df[col].fillna('INCONNU')
                    df[col] = df[col].apply(
                        lambda x: x if x in self.encodeurs[col].classes_ else 'INCONNU'
                    )
                df[f'{col}_encode'] = self.encodeurs[col].transform(df[col])
        
        # === CARACTÉRISTIQUES COMPORTEMENTALES ===
        # Fréquence d'activité par utilisateur
        freq_utilisateur = df['emailUtilisateur'].value_counts().to_dict()
        df['frequence_utilisateur'] = df['emailUtilisateur'].map(freq_utilisateur).fillna(0)
        df['frequence_utilisateur_normalisee'] = np.log1p(df['frequence_utilisateur'])
        
        # Fréquence par adresse IP
        freq_ip = df['adresseIP'].value_counts().to_dict()
        df['frequence_ip'] = df['adresseIP'].map(freq_ip).fillna(0)
        df['frequence_ip_normalisee'] = np.log1p(df['frequence_ip'])
        
        # Temps depuis le dernier événement (même utilisateur)
        df = df.sort_values(['emailUtilisateur', 'horodatage'])
        df['temps_dernier_evenement'] = df.groupby('emailUtilisateur')['horodatage'].diff().dt.total_seconds()
        df['temps_dernier_evenement'] = df['temps_dernier_evenement'].fillna(0)
        df['temps_dernier_evenement_normalise'] = np.log1p(df['temps_dernier_evenement'])
        
        # Taux d'échec par utilisateur
        def taux_echec_utilisateur(groupe):
            total = len(groupe)
            echecs = sum(groupe['statut'] == 'FAILED')
            return echecs / total if total > 0 else 0
        
        taux_echec = df.groupby('emailUtilisateur').apply(taux_echec_utilisateur).to_dict()
        df['taux_echec_utilisateur'] = df['emailUtilisateur'].map(taux_echec).fillna(0)
        
        # === CARACTÉRISTIQUES DE SÉQUENCE ===
        # Nombre d'événements dans la dernière heure
        df['evenements_derniere_heure'] = 0
        for idx, row in df.iterrows():
            heure_courante = row['horodatage']
            heure_avant = heure_courante - timedelta(hours=1)
            count = df[
                (df['emailUtilisateur'] == row['emailUtilisateur']) &
                (df['horodatage'] >= heure_avant) &
                (df['horodatage'] <= heure_courante)
            ].shape[0]
            df.at[idx, 'evenements_derniere_heure'] = count
        
        # === LISTE FINALE DES CARACTÉRISTIQUES ===
        colonnes_finales = [
            'heure', 'minute', 'jour_semaine', 'est_weekend', 'est_nuit',
            'est_matin', 'est_travail', 'est_soir',
            'frequence_utilisateur_normalisee', 'frequence_ip_normalisee',
            'temps_dernier_evenement_normalise', 'taux_echec_utilisateur',
            'evenements_derniere_heure'
        ]
        
        # Ajouter les colonnes encodées
        for col in colonnes_categorielles:
            if f'{col}_encode' in df.columns:
                colonnes_finales.append(f'{col}_encode')
        
        # Extraire les caractéristiques
        caracteristiques = df[colonnes_finales].fillna(0).values
        
        # Normaliser (sauf si déjà normalisé)
        if self.est_entraine:
            caracteristiques = self.scaler.transform(caracteristiques)
        
        return caracteristiques
    
    def entrainer(self, journaux: List[Dict]):
        """
        Entraîne le modèle Isolation Forest sur des logs historiques
        """
        if len(journaux) < 20:
            logger.warning(f"Pas assez de journaux pour entraîner le modèle (minimum 20, reçu {len(journaux)})")
            return False
            
        try:
            logger.info(f"🔄 Entraînement du modèle sur {len(journaux)} journaux...")
            
            # Préparer les caractéristiques
            caracteristiques = self._preparer_caracteristiques(journaux)
            
            if len(caracteristiques) == 0:
                logger.error("Erreur: Impossible de préparer les caractéristiques")
                return False
            
            # Normaliser
            caracteristiques = self.scaler.fit_transform(caracteristiques)
            
            # Entraîner Isolation Forest
            self.foret_isolation.fit(caracteristiques)
            self.est_entraine = True
            
            # Calculer les scores d'entraînement pour référence
            scores = self.foret_isolation.score_samples(caracteristiques)
            self.historique_scores = scores.tolist()
            
            logger.info(f"✅ Modèle entraîné avec succès sur {len(journaux)} journaux")
            logger.info(f"   Score moyen: {np.mean(scores):.3f}, Écart-type: {np.std(scores):.3f}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'entraînement: {e}")
            return False
    
    def detecter(self, journaux: List[Dict], seuil: float = None) -> List[Dict]:
        """
        Détecte les anomalies dans les logs
        Retourne une liste d'anomalies avec leurs caractéristiques
        """
        if not self.est_entraine or len(journaux) == 0:
            logger.warning("Modèle non entraîné ou logs vides")
            return []
        
        seuil = seuil or self.seuil_anomalie
        
        try:
            # Préparer les caractéristiques
            caracteristiques = self._preparer_caracteristiques(journaux)
            if len(caracteristiques) == 0:
                return []
            
            # Normaliser
            caracteristiques = self.scaler.transform(caracteristiques)
            
            # Prédictions et scores
            predictions = self.foret_isolation.predict(caracteristiques)
            scores = self.foret_isolation.score_samples(caracteristiques)
            
            # Normaliser les scores entre 0 et 1 (plus élevé = plus anormal)
            scores_normalises = 1 - (scores - np.min(scores)) / (np.max(scores) - np.min(scores) + 1e-10)
            
            anomalies = []
            for i, (pred, score_norm) in enumerate(zip(predictions, scores_normalises)):
                est_anomalie = pred == -1 and score_norm > seuil
                
                if est_anomalie:
                    journal = journaux[i]
                    
                    # Déterminer le type spécifique d'anomalie
                    type_anomalie = self._classifier_anomalie(journal, score_norm)
                    niveau_risque = self._calculer_niveau_risque(score_norm, type_anomalie)
                    explication = self._generer_explication(journal, type_anomalie, score_norm)
                    
                    # Vérifier les règles métier supplémentaires
                    regles_violees = self._verifier_regles_metier(journal, journaux)
                    
                    anomalies.append({
                        'id_journal': journal.get('id'),
                        'horodatage': journal.get('horodatage'),
                        'type_anomalie': type_anomalie,
                        'niveau_risque': niveau_risque,
                        'score_anomalie': round(float(score_norm), 4),
                        'explication': explication,
                        'email_utilisateur': journal.get('emailUtilisateur'),
                        'adresse_ip': journal.get('adresseIP'),
                        'type_evenement': journal.get('typeEvenement'),
                        'statut': journal.get('statut'),
                        'regles_metier_violees': regles_violees,
                        'details': journal.get('details', '')
                    })
            
            logger.info(f"🔍 Détection terminée: {len(anomalies)} anomalies trouvées sur {len(journaux)} logs")
            return anomalies
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la détection: {e}")
            return []
    
    def _classifier_anomalie(self, journal: Dict, score: float) -> str:
        """Classifie le type d'anomalie pour meilleure compréhension"""
        type_evenement = journal.get('typeEvenement', '')
        statut = journal.get('statut', '')
        details = journal.get('details', '').lower()
        heure = None
        
        if journal.get('horodatage'):
            try:
                heure = datetime.fromisoformat(journal['horodatage']).hour
            except:
                pass
        
        # Classification basée sur le contexte
        if statut == 'FAILED':
            if type_evenement == 'CONNEXION':
                return "TENTATIVE_CONNEXION_ECHOUEE"
            elif type_evenement == 'SIGNATURE_DOCUMENT':
                return "SIGNATURE_ECHOUEE"
            else:
                return f"ECHEC_{type_evenement}"
        
        elif heure is not None and (heure < 5 or heure > 22):
            return "HORAIRE_INHABITUEL"
        
        elif type_evenement == 'CONNEXION' and journal.get('adresseIP'):
            # IP suspecte (à enrichir avec une liste noire)
            ip = journal.get('adresseIP', '')
            if ip.startswith('192.168.') or ip.startswith('10.'):
                pass  # IP locale, moins suspecte
            else:
                return "CONNEXION_DEPUIS_IP_EXTERNE"
        
        elif score > 0.85:
            return "COMPORTEMENT_TRES_ANORMAL"
        elif score > 0.7:
            return "COMPORTEMENT_ANORMAL"
        else:
            return "ACTIVITE_SUSPECTE"
    
    def _calculer_niveau_risque(self, score: float, type_anomalie: str) -> str:
        """Calcule le niveau de risque basé sur le score et le type"""
        niveaux_critiques = ['TENTATIVE_CONNEXION_ECHOUEE', 'SIGNATURE_ECHOUEE']
        niveaux_eleves = ['COMPORTEMENT_TRES_ANORMAL', 'HORAIRE_INHABITUEL']
        
        if type_anomalie in niveaux_critiques:
            return "CRITIQUE"
        elif type_anomalie in niveaux_eleves:
            return "ELEVE"
        elif score > 0.7:
            return "ELEVE"
        elif score > 0.6:
            return "MOYEN"
        else:
            return "FAIBLE"
    
    def _generer_explication(self, journal: Dict, type_anomalie: str, score: float) -> str:
        """Génère une explication lisible pour l'utilisateur"""
        email = journal.get('emailUtilisateur', 'Utilisateur inconnu')
        evenement = journal.get('typeEvenement', 'action')
        timestamp = journal.get('horodatage', 'date inconnue')
        
        explications = {
            'TENTATIVE_CONNEXION_ECHOUEE': f"🔐 {email} a eu une tentative de connexion échouée depuis {journal.get('adresseIP', 'IP inconnue')}",
            'SIGNATURE_ECHOUEE': f"📝 {email} n'a pas pu signer le document {journal.get('nomDocument', 'inconnu')}",
            'HORAIRE_INHABITUEL': f"⏰ Activité suspecte de {email} à {timestamp} (horaire inhabituel)",
            'CONNEXION_DEPUIS_IP_EXTERNE': f"🌐 Connexion de {email} depuis une IP externe: {journal.get('adresseIP')}",
            'COMPORTEMENT_TRES_ANORMAL': f"⚠️ Comportement très anormal détecté pour {email} (score: {score:.2f})",
            'COMPORTEMENT_ANORMAL': f"⚡ Comportement anormal détecté pour {email}",
            'ACTIVITE_SUSPECTE': f"❓ Activité suspecte de {email} sur {evenement}"
        }
        
        return explications.get(type_anomalie, f"Anomalie détectée pour {email} (score: {score:.2f})")
    
    def _verifier_regles_metier(self, journal: Dict, tous_journaux: List[Dict]) -> List[str]:
        """Vérifie les règles métier spécifiques"""
        regles_violees = []
        type_event = journal.get('typeEvenement', '')
        email = journal.get('emailUtilisateur', '')
        
        if type_event in self.seuils_types:
            seuils = self.seuils_types[type_event]
            
            # Filtrer les logs du même utilisateur
            logs_user = [j for j in tous_journaux if j.get('emailUtilisateur') == email]
            
            # Compter les échecs récents
            if 'max_failed_per_hour' in seuils:
                maintenant = datetime.fromisoformat(journal['horodatage']) if journal.get('horodatage') else datetime.now()
                heure_avant = maintenant - timedelta(hours=1)
                
                echecs_recents = sum(1 for j in logs_user 
                                    if j.get('statut') == 'FAILED' 
                                    and j.get('typeEvenement') == type_event
                                    and j.get('horodatage') 
                                    and datetime.fromisoformat(j['horodatage']) >= heure_avant)
                
                if echecs_recents >= seuils['max_failed_per_hour']:
                    regles_violees.append(f"Trop d'échecs en une heure ({echecs_recents}/{seuils['max_failed_per_hour']})")
        
        return regles_violees
    
    def detecter_pics_activite(self, journaux: List[Dict], fenetre_minutes: int = 5) -> List[Dict]:
        """
        Détecte des pics d'activité anormaux (potentielle attaque DDoS ou brute force)
        """
        if not journaux:
            return []
        
        df = pd.DataFrame(journaux)
        df['horodatage'] = pd.to_datetime(df['horodatage'])
        df = df.set_index('horodatage')
        
        pics = []
        
        for type_evenement in df['typeEvenement'].unique():
            df_event = df[df['typeEvenement'] == type_evenement]
            if len(df_event) < 5:
                continue
            
            # Regrouper par fenêtre de temps
            regroupe = df_event.resample(f'{fenetre_minutes}T').size()
            
            if len(regroupe) == 0:
                continue
            
            # Calculer seuil (moyenne + 3 écarts-types)
            moyenne = regroupe.mean()
            ecart_type = regroupe.std()
            seuil = moyenne + 3 * ecart_type
            
            # Identifier les pics
            pics_detectes = regroupe[regroupe > seuil]
            
            for temps_pic, compte in pics_detectes.items():
                # Analyser le pic
                evenements_pic = df_event[
                    (df_event.index >= temps_pic) & 
                    (df_event.index < temps_pic + timedelta(minutes=fenetre_minutes))
                ]
                
                tentatives_echouees = sum(evenements_pic['statut'] == 'FAILED')
                ips_uniques = evenements_pic['adresseIP'].nunique()
                utilisateurs_uniques = evenements_pic['emailUtilisateur'].nunique()
                
                # Déterminer si c'est une attaque potentielle
                est_attaque = (
                    tentatives_echouees > compte * 0.5 or  # Plus de 50% d'échecs
                    ips_uniques == 1 or                     # Une seule IP
                    utilisateurs_uniques == 1               # Un seul utilisateur
                )
                
                severite = "CRITIQUE" if tentatives_echouees > 20 else "ELEVE" if tentatives_echouees > 10 else "MOYEN"
                
                pics.append({
                    'horodatage': temps_pic.isoformat(),
                    'type_evenement': type_evenement,
                    'compte': int(compte),
                    'seuil': float(seuil),
                    'tentatives_echouees': tentatives_echouees,
                    'ips_uniques': ips_uniques,
                    'utilisateurs_uniques': utilisateurs_uniques,
                    'est_attaque_potentielle': est_attaque,
                    'severite': severite,
                    'recommandation': "Bloquer l'IP source" if ips_uniques == 1 else "Investigation requise"
                })
        
        return sorted(pics, key=lambda x: x['compte'], reverse=True)
    
    def obtenir_statistiques_anomalies(self, anomalies: List[Dict]) -> Dict:
        """Génère des statistiques sur les anomalies détectées"""
        if not anomalies:
            return {
                'total': 0,
                'par_type': {},
                'par_niveau': {},
                'par_utilisateur': {},
                'tendance': 'stable'
            }
        
        stats = {
            'total': len(anomalies),
            'par_type': Counter(a.get('type_anomalie', 'INCONNU') for a in anomalies),
            'par_niveau': Counter(a.get('niveau_risque', 'INCONNU') for a in anomalies),
            'par_utilisateur': Counter(a.get('email_utilisateur', 'INCONNU') for a in anomalies),
            'utilisateurs_impactes': len(set(a.get('email_utilisateur') for a in anomalies if a.get('email_utilisateur')))
        }
        
        # Déterminer la tendance (à enrichir avec historique)
        if stats['par_niveau'].get('CRITIQUE', 0) > 0:
            stats['tendance'] = 'critique'
        elif stats['par_niveau'].get('ELEVE', 0) > 3:
            stats['tendance'] = 'hausse'
        elif stats['total'] > 10:
            stats['tendance'] = 'attention'
        else:
            stats['tendance'] = 'stable'
        
        return stats