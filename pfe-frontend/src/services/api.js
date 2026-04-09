import axios from 'axios';

// URL de base selon l'environnement
const getBaseURL = () => {
  // On vérifie d'abord si l'URL est définie dans les variables d'environnement (Render)
  if (process.env.REACT_APP_API_URL) {
    return `${process.env.REACT_APP_API_URL}/api`;
  }
  
  // Si on est en production sur Render mais que la variable est oubliée, 
  // on utilise ton URL backend directe pour éviter le "localhost" par défaut
  if (process.env.NODE_ENV === 'production') {
    return 'https://memoiresignaturenumerique.onrender.com/api';
  }

  // Développement local (Spring Boot par défaut sur 8080 ou 8443)
  return 'http://localhost:8080/api';
};

const API = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true, // Crucial pour les cookies et sessions sécurisées
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Intercepteur pour ajouter le token JWT (Sécurité supplémentaire)
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs globales
API.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si le serveur ne répond pas du tout (ex: ERR_CONNECTION_REFUSED)
        if (!error.response) {
            console.error("Le serveur est injoignable. Vérifiez l'URL de l'API ou le réveil du service Render.");
            return Promise.reject(error);
        }

        const urlReq = error.config?.url || "";
        const isAuthRoute = urlReq.includes('/connexion') || 
                           urlReq.includes('/verifier-otp') || 
                           urlReq.includes('/auth/check') ||
                           urlReq.includes('/login');

        // Gestion des erreurs 401 (Session expirée ou non authentifié)
        if (error.response.status === 401 && !isAuthRoute) {
            // Nettoyage complet
            localStorage.clear(); 
            
            // Suppression du cookie accessToken
            document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            // Redirection vers la page de connexion
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        
        // Gestion des erreurs 403 (Droits insuffisants)
        if (error.response.status === 403) {
            console.error('Accès refusé : Vous n\'avez pas les permissions nécessaires.');
        }
        
        return Promise.reject(error);
    }
);

export default API;