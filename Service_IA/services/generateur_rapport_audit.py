# service_ia/services/generateur_rapport_audit.py
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import Counter, defaultdict
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

class GenerateurRapportAudit:
    """
    Génère des rapports d'audit complets au format JSON ou PDF
    """
    
    def __init__(self):
        self.version = "1.0"
        self.nom_service = "Assistant d'Audit Intelligent"
    
    def generer(self, journaux: List[Dict], date_debut: datetime, date_fin: datetime, 
                anomalies: List[Dict] = None) -> Dict:
        """
        Génère un rapport d'audit complet
        """
        if not journaux:
            return self._rapport_vide(date_debut, date_fin)
        
        # Identifiant unique du rapport
        id_rapport = self._generer_id_rapport(date_debut, date_fin)
        
        # Statistiques globales
        statistiques = self._calculer_statistiques_globales(journaux)
        
        # Analyse temporelle
        analyse_temporelle = self._analyser_tendance_temporelle(journaux)
        
        # Top utilisateurs
        top_utilisateurs = self._identifier_top_utilisateurs(journaux)
        
        # Résumé des anomalies (si fournies)
        resume_anomalies = self._resumer_anomalies(anomalies) if anomalies else None
        
        # Recommandations
        recommandations = self._generer_recommandations_rapport(statistiques, anomalies)
        
        rapport = {
            'id_rapport': id_rapport,
            'version': self.version,
            'service': self.nom_service,
            'periode': {
                'debut': date_debut.isoformat(),
                'fin': date_fin.isoformat(),
                'duree_jours': (date_fin - date_debut).days
            },
            'genere_le': datetime.now().isoformat(),
            'resume_executif': self._generer_resume_executif(statistiques, anomalies),
            'statistiques_globales': statistiques,
            'analyse_temporelle': analyse_temporelle,
            'top_utilisateurs': top_utilisateurs,
            'analyse_evenements': self._analyser_evenements_par_type(journaux),
            'analyse_securite': self._analyser_securite(journaux),
            'resume_anomalies': resume_anomalies,
            'recommandations': recommandations,
            'metriques_cles': self._extraire_metriques_cles(statistiques),
            'annexes': {
                'total_journaux_analyses': len(journaux),
                'fichiers_impactes': len(set(j.get('nomDocument') for j in journaux if j.get('nomDocument'))),
                'periodes_critiques': self._identifier_periodes_critiques(journaux)
            }
        }
        
        return rapport
    
    def _rapport_vide(self, date_debut: datetime, date_fin: datetime) -> Dict:
        """Génère un rapport vide quand aucune donnée n'est disponible"""
        return {
            'id_rapport': self._generer_id_rapport(date_debut, date_fin),
            'version': self.version,
            'service': self.nom_service,
            'periode': {
                'debut': date_debut.isoformat(),
                'fin': date_fin.isoformat()
            },
            'genere_le': datetime.now().isoformat(),
            'resume_executif': "Aucune donnée d'audit disponible pour la période sélectionnée.",
            'statistiques_globales': {'total_evenements': 0},
            'message': "Aucune activité enregistrée sur cette période"
        }
    
    def _generer_id_rapport(self, date_debut: datetime, date_fin: datetime) -> str:
        """Génère un identifiant unique pour le rapport"""
        seed = f"{date_debut.isoformat()}_{date_fin.isoformat()}_{datetime.now().timestamp()}"
        return f"AUDIT_{hashlib.md5(seed.encode()).hexdigest()[:8].upper()}"
    
    def _calculer_statistiques_globales(self, journaux: List[Dict]) -> Dict:
        """Calcule les statistiques globales à partir des logs"""
        total = len(journaux)
        
        # Statistiques par statut
        statuts = Counter(j.get('statut', 'INCONNU') for j in journaux)
        succes = statuts.get('SUCCESS', 0)
        echecs = statuts.get('FAILED', 0)
        
        # Taux de succès
        taux_succes = round((succes / total) * 100, 2) if total > 0 else 0
        
        # Types d'événements
        types_evenements = Counter(j.get('typeEvenement', 'INCONNU') for j in journaux)
        
        # Utilisateurs
        utilisateurs = set(j.get('emailUtilisateur') for j in journaux if j.get('emailUtilisateur'))
        
        # Documents
        documents = set(j.get('nomDocument') for j in journaux if j.get('nomDocument'))
        documents_signes = sum(1 for j in journaux 
                              if j.get('typeEvenement') == 'SIGNATURE_DOCUMENT' 
                              and j.get('statut') == 'SUCCESS')
        
        # Signatures par type
        signatures_simples = sum(1 for j in journaux 
                                if j.get('typeEvenement') == 'SIGNATURE_DOCUMENT'
                                and j.get('typeSignature') == 'simple'
                                and j.get('statut') == 'SUCCESS')
        
        signatures_pki = sum(1 for j in journaux 
                            if j.get('typeEvenement') == 'SIGNATURE_DOCUMENT'
                            and j.get('typeSignature') == 'pki'
                            and j.get('statut') == 'SUCCESS')
        
        signatures_auto = sum(1 for j in journaux 
                             if j.get('typeEvenement') == 'AUTO_SIGNATURE'
                             and j.get('statut') == 'SUCCESS')
        
        return {
            'total_evenements': total,
            'succes': succes,
            'echecs': echecs,
            'taux_succes': taux_succes,
            'utilisateurs_actifs': len(utilisateurs),
            'documents_impactes': len(documents),
            'documents_signes': documents_signes,
            'repartition_signatures': {
                'simple': signatures_simples,
                'pki': signatures_pki,
                'auto': signatures_auto
            },
            'types_evenements': dict(types_evenements.most_common(10)),
            'periode_pointe': self._identifier_periode_pointe(journaux)
        }
    
    def _analyser_tendance_temporelle(self, journaux: List[Dict]) -> Dict:
        """Analyse la tendance temporelle des événements"""
        if not journaux:
            return {}
        
        # Regrouper par jour
        evenements_par_jour = defaultdict(int)
        echecs_par_jour = defaultdict(int)
        
        for journal in journaux:
            horodatage = journal.get('horodatage')
            if horodatage:
                try:
                    jour = datetime.fromisoformat(horodatage).date().isoformat()
                    evenements_par_jour[jour] += 1
                    if journal.get('statut') == 'FAILED':
                        echecs_par_jour[jour] += 1
                except:
                    pass
        
        jours = sorted(evenements_par_jour.keys())
        tendance = []
        
        for jour in jours[-7:]:  # Derniers 7 jours
            total = evenements_par_jour.get(jour, 0)
            echecs = echecs_par_jour.get(jour, 0)
            tendance.append({
                'date': jour,
                'total': total,
                'echecs': echecs,
                'taux_echec': round((echecs / total) * 100, 2) if total > 0 else 0
            })
        
        # Calculer la variation
        variation = 0
        if len(tendance) >= 2:
            ancien = tendance[-2]['total'] if len(tendance) >= 2 else 0
            recent = tendance[-1]['total']
            variation = ((recent - ancien) / ancien * 100) if ancien > 0 else 0
        
        return {
            'tendance_7_jours': tendance,
            'variation_pourcentage': round(variation, 2),
            'tendance_globale': 'hausse' if variation > 10 else 'baisse' if variation < -10 else 'stable'
        }
    
    def _identifier_top_utilisateurs(self, journaux: List[Dict]) -> List[Dict]:
        """Identifie les utilisateurs les plus actifs"""
        activite_utilisateurs = defaultdict(lambda: {'total': 0, 'succes': 0, 'echecs': 0})
        
        for journal in journaux:
            email = journal.get('emailUtilisateur')
            if email:
                activite_utilisateurs[email]['total'] += 1
                if journal.get('statut') == 'SUCCESS':
                    activite_utilisateurs[email]['succes'] += 1
                elif journal.get('statut') == 'FAILED':
                    activite_utilisateurs[email]['echecs'] += 1
        
        # Convertir en liste et trier
        top = []
        for email, stats in activite_utilisateurs.items():
            total = stats['total']
            top.append({
                'email': email,
                'total_actions': total,
                'taux_succes': round((stats['succes'] / total) * 100, 2) if total > 0 else 0,
                'niveau_activite': 'ELEVE' if total > 50 else 'MOYEN' if total > 10 else 'FAIBLE'
            })
        
        return sorted(top, key=lambda x: x['total_actions'], reverse=True)[:10]
    
    def _analyser_evenements_par_type(self, journaux: List[Dict]) -> Dict:
        """Analyse détaillée par type d'événement"""
        analyse = {}
        
        for type_event in set(j.get('typeEvenement') for j in journaux if j.get('typeEvenement')):
            events = [j for j in journaux if j.get('typeEvenement') == type_event]
            total = len(events)
            succes = sum(1 for e in events if e.get('statut') == 'SUCCESS')
            echecs = sum(1 for e in events if e.get('statut') == 'FAILED')
            
            analyse[type_event] = {
                'total': total,
                'succes': succes,
                'echecs': echecs,
                'taux_succes': round((succes / total) * 100, 2) if total > 0 else 0,
                'pourcentage_total': round((total / len(journaux)) * 100, 2)
            }
        
        return analyse
    
    def _analyser_securite(self, journaux: List[Dict]) -> Dict:
        """Analyse la sécurité à partir des logs"""
        # Connexions échouées
        connexions_echouees = sum(1 for j in journaux 
                                  if j.get('typeEvenement') == 'CONNEXION' 
                                  and j.get('statut') == 'FAILED')
        
        # Tentatives de signature échouées
        signatures_echouees = sum(1 for j in journaux 
                                  if j.get('typeEvenement') == 'SIGNATURE_DOCUMENT' 
                                  and j.get('statut') == 'FAILED')
        
        # IPs suspectes (plusieurs échecs)
        ips_suspectes = defaultdict(int)
        for j in journaux:
            if j.get('statut') == 'FAILED' and j.get('adresseIP'):
                ips_suspectes[j['adresseIP']] += 1
        
        ips_a_surveiller = [{'ip': ip, 'echecs': count} 
                           for ip, count in ips_suspectes.items() 
                           if count >= 5]
        
        niveau_global = "ELEVE" if connexions_echouees > 20 else "MOYEN" if connexions_echouees > 5 else "FAIBLE"
        
        return {
            'niveau_securite_global': niveau_global,
            'connexions_echouees': connexions_echouees,
            'signatures_echouees': signatures_echouees,
            'ips_suspectes': ips_a_surveiller[:5],
            'recommandations_securite': self._generer_recos_securite(connexions_echouees, signatures_echouees, len(ips_a_surveiller))
        }
    
    def _resumer_anomalies(self, anomalies: List[Dict]) -> Dict:
        """Résume les anomalies détectées"""
        if not anomalies:
            return {'total': 0, 'message': 'Aucune anomalie détectée'}
        
        types = Counter(a.get('type_anomalie', 'INCONNU') for a in anomalies)
        niveaux = Counter(a.get('niveau_risque', 'INCONNU') for a in anomalies)
        utilisateurs = Counter(a.get('email_utilisateur', 'INCONNU') for a in anomalies)
        
        return {
            'total': len(anomalies),
            'par_type': dict(types.most_common()),
            'par_niveau': dict(niveaux),
            'utilisateurs_concernes': len(utilisateurs),
            'top_utilisateurs': [{'email': u, 'anomalies': c} for u, c in utilisateurs.most_common(5)],
            'anomalies_critiques': [a for a in anomalies if a.get('niveau_risque') == 'CRITIQUE'][:10]
        }
    
    def _generer_recommandations_rapport(self, statistiques: Dict, anomalies: List[Dict] = None) -> List[str]:
        """Génère des recommandations pour le rapport"""
        recommandations = []
        
        taux_succes = statistiques.get('taux_succes', 100)
        
        if taux_succes < 80:
            recommandations.append(f"⚠️ Taux de succès faible ({taux_succes}%) - Analyser les causes d'échec")
        
        if anomalies and len(anomalies) > 10:
            recommandations.append("🚨 Nombre élevé d'anomalies - Audit de sécurité recommandé")
        
        if statistiques.get('echecs', 0) > 50:
            recommandations.append("🔧 Nombreux échecs détectés - Vérifier la configuration du système")
        
        # Recommandations générales
        recommandations.extend([
            "📊 Mettre en place une surveillance continue des logs d'audit",
            "🔐 Revoir les politiques de sécurité si nécessaire",
            "📅 Planifier des audits réguliers (hebdomadaires/mensuels)",
            "👥 Former les utilisateurs aux bonnes pratiques de signature"
        ])
        
        return recommandations[:5]  # Max 5 recommandations
    
    def _generer_resume_executif(self, statistiques: Dict, anomalies: List[Dict] = None) -> str:
        """Génère un résumé exécutif du rapport"""
        total = statistiques.get('total_evenements', 0)
        taux_succes = statistiques.get('taux_succes', 0)
        utilisateurs = statistiques.get('utilisateurs_actifs', 0)
        
        resume = f"Pendant la période analysée, {total} événements ont été enregistrés, "
        resume += f"avec un taux de succès de {taux_succes}%. "
        resume += f"{utilisateurs} utilisateurs actifs ont été identifiés."
        
        if anomalies:
            nb_anomalies = len(anomalies)
            if nb_anomalies > 0:
                resume += f" {nb_anomalies} anomalies ont été détectées, nécessitant une attention particulière."
        
        return resume
    
    def _extraire_metriques_cles(self, statistiques: Dict) -> Dict:
        """Extrait les métriques clés pour le dashboard"""
        return {
            'taux_succes_global': statistiques.get('taux_succes', 0),
            'total_evenements': statistiques.get('total_evenements', 0),
            'documents_signes': statistiques.get('documents_signes', 0),
            'utilisateurs_actifs': statistiques.get('utilisateurs_actifs', 0),
            'tendance': self._analyser_tendance_temporelle_rapide(statistiques)
        }
    
    def _identifier_periode_pointe(self, journaux: List[Dict]) -> Optional[Dict]:
        """Identifie la période avec le plus d'activité"""
        if not journaux:
            return None
        
        evenements_par_heure = defaultdict(int)
        for journal in journaux:
            horodatage = journal.get('horodatage')
            if horodatage:
                try:
                    heure = datetime.fromisoformat(horodatage).hour
                    evenements_par_heure[heure] += 1
                except:
                    pass
        
        if evenements_par_heure:
            heure_pointe = max(evenements_par_heure, key=evenements_par_heure.get)
            return {
                'heure': heure_pointe,
                'nombre_evenements': evenements_par_heure[heure_pointe]
            }
        return None
    
    def _identifier_periodes_critiques(self, journaux: List[Dict]) -> List[Dict]:
        """Identifie les périodes critiques (forte activité ou nombreux échecs)"""
        if len(journaux) < 10:
            return []
        
        periodes = []
        journaux_tries = sorted(journaux, key=lambda x: x.get('horodatage', ''))
        
        # Analyser par fenêtres de 1 heure
        fenetre = timedelta(hours=1)
        i = 0
        
        while i < len(journaux_tries):
            debut = datetime.fromisoformat(journaux_tries[i]['horodatage']) if journaux_tries[i].get('horodatage') else None
            if not debut:
                i += 1
                continue
            
            fin = debut + fenetre
            evenements_fenetre = []
            
            j = i
            while j < len(journaux_tries):
                t = journaux_tries[j].get('horodatage')
                if t and datetime.fromisoformat(t) <= fin:
                    evenements_fenetre.append(journaux_tries[j])
                    j += 1
                else:
                    break
            
            if len(evenements_fenetre) > 20:  # Seuil d'activité élevée
                echecs = sum(1 for e in evenements_fenetre if e.get('statut') == 'FAILED')
                periodes.append({
                    'debut': debut.isoformat(),
                    'fin': fin.isoformat(),
                    'total': len(evenements_fenetre),
                    'echecs': echecs,
                    'taux_echec': round((echecs / len(evenements_fenetre)) * 100, 2)
                })
            
            i = j if j > i else i + 1
        
        return periodes[:5]  # Top 5 périodes critiques
    
    def _analyser_tendance_temporelle_rapide(self, statistiques: Dict) -> str:
        """Analyse rapide de la tendance"""
        # Version simplifiée pour les métriques clés
        return "stable"  # À enrichir avec données historiques
    
    def _generer_recos_securite(self, connexions_echouees: int, signatures_echouees: int, nb_ips_suspectes: int) -> List[str]:
        """Génère des recommandations de sécurité spécifiques"""
        recos = []
        
        if connexions_echouees > 10:
            recos.append("Augmenter la sécurité des connexions (MFA, captcha)")
        if signatures_echouees > 10:
            recos.append("Vérifier le processus de signature et l'infrastructure PKI")
        if nb_ips_suspectes > 3:
            recos.append("Mettre en place une liste noire d'IP suspectes")
        
        return recos