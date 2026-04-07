import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import API from '../services/api';  // ✅ Chemin CORRECT


const PrivateRoute = ({ children, allowedRoles }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                // 1. Vérifier d'abord si token existe dans localStorage
                const token = localStorage.getItem('accessToken');
                
                if (!token) {
                    console.warn('[Auth] Aucun token trouvé');
                    if (isMounted) setIsAuthorized(false);
                    return;
                }

                // 2. Vérifier l'authentification auprès du backend
                const response = await API.get('/auth/check');
                
                if (!isMounted) return;

                if (response.data.authentifie) {
                    const role = response.data.role;
                    setUserRole(role);
                    
                    // 3. Vérifier si l'utilisateur a le bon rôle
                    if (allowedRoles && allowedRoles.length > 0) {
                        if (!allowedRoles.includes(role)) {
                            console.warn(`[Auth] Rôle insuffisant. Requis: ${allowedRoles.join(', ')}, Reçu: ${role}`);
                            setIsAuthorized(false);
                            return;
                        }
                    }
                    
                    console.log(`[Auth] ✅ Autorisé avec le rôle: ${role}`);
                    setIsAuthorized(true);
                } else {
                    console.warn('[Auth] Non authentifié');
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error('[Auth] Erreur de vérification:', error.response?.data || error.message);
                
                // Si erreur 401 (token expiré), on tente de rafraîchir
                if (error.response?.status === 401) {
                    try {
                        const refreshToken = localStorage.getItem('refreshToken');
                        if (refreshToken) {
                            const refreshResponse = await API.post('/auth/refresh', { refreshToken });
                            if (refreshResponse.data.accessToken) {
                                localStorage.setItem('accessToken', refreshResponse.data.accessToken);
                                // Réessayer la vérification
                                await checkAuth();
                                return;
                            }
                        }
                    } catch (refreshError) {
                        console.error('[Auth] Échec du rafraîchissement du token');
                        localStorage.clear();
                    }
                }
                
                if (isMounted) setIsAuthorized(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowedRoles]); // Ajout de allowedRoles comme dépendance

    // Affichage du chargement
    if (isAuthorized === null) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    // Redirection si non autorisé
    if (!isAuthorized) {
        return <Navigate to="/connexion" replace />; // ⚠️ Rediriger vers /connexion pas vers /
    }

    return children;
};

export default PrivateRoute;