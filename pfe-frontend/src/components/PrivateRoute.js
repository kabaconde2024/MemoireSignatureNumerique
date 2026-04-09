import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import API from '../services/api';

const PrivateRoute = ({ children, allowedRoles }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                // IMPORTANT : On ne vérifie plus le localStorage ici.
                // Le navigateur enverra automatiquement le cookie accessToken 
                // grâce à 'withCredentials: true' dans ton instance API.
                
                const response = await API.get('/auth/check');
                
                if (!isMounted) return;

                if (response.data.authentifie) {
                    const role = response.data.role;
                    setUserRole(role);
                    
                    // Vérification du rôle
                    if (allowedRoles && allowedRoles.length > 0) {
                        if (!allowedRoles.includes(role)) {
                            console.warn(`[Auth] Rôle insuffisant: ${role}`);
                            setIsAuthorized(false);
                            return;
                        }
                    }
                    
                    console.log(`[Auth] ✅ Accès accordé pour: ${role}`);
                    setIsAuthorized(true);
                } else {
                    console.warn('[Auth] Session invalide ou expirée');
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error('[Auth] Erreur lors de la vérification du cookie:', error.message);
                if (isMounted) setIsAuthorized(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, [allowedRoles]);

    if (isAuthorized === null) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/connexion" replace />;
    }

    return children;
};

export default PrivateRoute;