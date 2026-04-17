import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Alert, Container, Box } from '@mui/material';
import API from '../../services/api';

const FinaliserInscription = () => {
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [status, setStatus] = useState({ type: '', msg: '' });
    const navigate = useNavigate();

    // On récupère le TOKEN depuis l'URL (ex: ?token=uuid...)
    const token = searchParams.get('token');

    // Sécurité : si pas de token, on affiche une erreur immédiatement
    useEffect(() => {
        if (!token) {
            setStatus({ 
                type: 'error', 
                msg: 'Lien invalide : aucun jeton d\'activation trouvé.' 
            });
        }
    }, [token]);

   const handleFinalize = async (e) => {
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Traitement en cours...' }); // Feedback visuel

    try {
        console.log("Tentative d'activation avec le token:", token);

        const response = await API.post('/finaliser-activation', { 
            token: token, 
            motDePasse: password 
        });

        console.log("Réponse du serveur:", response.data);
        setStatus({ type: 'success', msg: 'Succès ! Redirection...' });
        
        setTimeout(() => navigate('/'), 2000);

    } catch (err) {
        console.error("Erreur complète:", err);
        const errorMsg = err.response?.data?.erreur || "Erreur de connexion au serveur";
        setStatus({ type: 'error', msg: errorMsg });
    }
};

    return (
        <Container maxWidth="sm">
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <Paper elevation={3} sx={{ p: 4, borderRadius: 3, width: '100%' }}>
                    <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
                        Finalisez votre inscription
                    </Typography>
                    <Typography variant="body2" color="textSecondary" align="center" mb={3}>
                        Veuillez définir votre mot de passe pour activer votre espace sécurisé.
                    </Typography>

                    {status.msg && (
                        <Alert severity={status.type} sx={{ mb: 3 }}>
                            {status.msg}
                        </Alert>
                    )}

                    {/* On affiche le formulaire seulement si un token est présent */}
                    {token && (
                        <form onSubmit={handleFinalize}>
                            <TextField 
                                fullWidth 
                                label="Nouveau mot de passe" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                sx={{ mb: 2 }} 
                                required 
                            />
                            <TextField 
                                fullWidth 
                                label="Confirmez le mot de passe" 
                                type="password" 
                                value={confirmPwd} 
                                onChange={(e) => setConfirmPwd(e.target.value)} 
                                sx={{ mb: 3 }} 
                                required 
                            />
                            
                            <Button 
                                fullWidth 
                                variant="contained" 
                                type="submit" 
                                disabled={status.type === 'success'}
                                sx={{ 
                                    bgcolor: '#3b82f6', 
                                    py: 1.5,
                                    '&:hover': { bgcolor: '#2563eb' } 
                                }}
                            >
                                Activer mon compte
                            </Button>
                        </form>
                    )}

                    {!token && (
                        <Button fullWidth variant="outlined" onClick={() => navigate('/')}>
                            Retour à l'accueil
                        </Button>
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default FinaliserInscription;