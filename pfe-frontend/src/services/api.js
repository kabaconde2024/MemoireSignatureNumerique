import axios from 'axios';

const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return `${process.env.REACT_APP_API_URL}/api`;
  }
  return 'https://memoiresignaturenumerique.onrender.com/api';
};

const API = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true, // ✅ Indispensable pour envoyer le cookie HttpOnly automatiquement
    headers: {
        'Accept': 'application/json'
        // ⚠️ Suppression du 'Content-Type': 'application/json' par défaut
        // car cela pose problème lors des uploads de fichiers (multipart).
        // Axios le mettra tout seul quand c'est du JSON.
    }
});

// ✅ ON SUPPRIME l'intercepteur de requête qui ajoute "Authorization"
// Pourquoi ? Parce que le navigateur gère maintenant le cookie accessToken 
// tout seul. Ajouter manuellement un header peut déclencher des erreurs CORS 
// inutiles sur Render lors d'un upload.

API.interceptors.response.use(
    (response) => response,
    (error) => {
        const urlReq = error.config?.url || "";
        const isAuthRoute = urlReq.includes('/connexion') || 
                           urlReq.includes('/verifier-otp') || 
                           urlReq.includes('/auth/check');

        if (error.response?.status === 401 && !isAuthRoute) {
            // Nettoyage complet
            localStorage.clear(); 
            
            // On expire le cookie côté client (en complément du backend)
            document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            window.location.href = '/';
        }
        
        if (error.response?.status === 403) {
            console.error('🚫 Accès interdit (403) : Vérifiez les droits ou le format de la requête.');
        }
        
        return Promise.reject(error);
    }
);

export default API;