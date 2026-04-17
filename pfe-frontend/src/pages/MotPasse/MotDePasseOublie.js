import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Container, Alert, CircularProgress, InputAdornment } from '@mui/material';
import { Email, Lock, Security } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// URL de l'API backend
const API_BASE_URL = 'https://trustsign-backend-3zsj.onrender.com';

// Fonction pour les requêtes API avec cookie
const fetchAPI = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.erreur || `HTTP ${response.status}`);
    }
    return response.json();
};

const MotDePasseOublie = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleDemande = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await fetchAPI('/api/mot-de-passe-oublie', { 
                method: 'POST',
                body: JSON.stringify({ email })
            });
            setMessage(data.message);
            setStep(2);
        } catch (err) {
            const msg = err.message || "Impossible de contacter le serveur.";
            setError(msg);
        } finally { 
            setLoading(false); 
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await fetchAPI('/api/reinitialiser-mot-de-passe', { 
                method: 'POST',
                body: JSON.stringify({ email, code, nouveauMotDePasse })
            });
            setMessage("Mot de passe modifié ! Redirection...");
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            setError(err.message || "Code invalide ou expiré.");
        } finally { 
            setLoading(false); 
        }
    };

    const fieldStyle = {
        "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: 'rgba(0, 0, 0, 0.2)' },
            "&.Mui-focused fieldset": { borderColor: '#3b82f6' }
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: '#2d5189' }}>
            <Container maxWidth="xs">
                <Box sx={{ 
                    p: 4, bgcolor: 'rgba(255, 255, 255, 0.9)', 
                    backdropFilter: 'blur(10px)', borderRadius: 4, textAlign: 'center' 
                }}>
                    <Typography variant="h5" fontWeight="900" sx={{ mb: 1, color: '#000' }}>
                        {step === 1 ? "RÉINITIALISATION" : "NOUVEAU PASS"}
                    </Typography>
                    <Box sx={{ width: 40, height: 4, bgcolor: '#3b82f6', mx: 'auto', mb: 3 }} />

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

                    {step === 1 ? (
                        <form onSubmit={handleDemande}>
                            <TextField 
                                fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                                margin="normal" sx={fieldStyle}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Email /></InputAdornment> }}
                            />
                            <Button fullWidth variant="contained" type="submit" disabled={loading} sx={{ mt: 2, py: 1.5, bgcolor: '#000' }}>
                                {loading ? <CircularProgress size={24} /> : "Envoyer le code"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleReset}>
                            <TextField 
                                fullWidth label="Code OTP" value={code} onChange={(e) => setCode(e.target.value)} required 
                                margin="normal" sx={fieldStyle}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Security /></InputAdornment> }}
                            />
                            <TextField 
                                fullWidth label="Nouveau mot de passe" type="password" 
                                value={nouveauMotDePasse} onChange={(e) => setNouveauMotDePasse(e.target.value)} 
                                required margin="normal" sx={fieldStyle}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Lock /></InputAdornment> }}
                            />
                            <Button fullWidth variant="contained" color="success" type="submit" sx={{ mt: 2, py: 1.5 }} disabled={loading}>
                                {loading ? <CircularProgress size={24} /> : "Valider"}
                            </Button>
                        </form>
                    )}
                    
                    <Button onClick={() => navigate('/')} sx={{ mt: 2, color: '#000', textTransform: 'none', opacity: 0.6 }}>
                        Retour à l'accueil
                    </Button>
                </Box>
            </Container>
        </Box>
    );
};

export default MotDePasseOublie;