// components/superadmin/ConfigurationView.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Grid, TextField, Button, 
    Switch, FormControlLabel, Divider, Alert, Stack, Card,
    Chip, Tooltip
} from '@mui/material';
import { 
    Save, Security, Email, Storage, Refresh, 
    CheckCircle, Cancel, Info
} from '@mui/icons-material';
import axios from 'axios';

const ConfigurationView = ({ setSnackbar }) => {
    const [config, setConfig] = useState({
        pkiCertificatDureeMinutes: 5,
        signatureExpirationJours: 7,
        emailNotifications: true,
        smsEnabled: true,
        mfaObligatoire: false,
        otpExpirationMinutes: 10,
        otpLongueur: 6
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/admin/config', { withCredentials: true });
            setConfig(response.data);
        } catch (error) {
            console.error("Erreur chargement config:", error);
        }
    };

    const saveConfig = async () => {
        setLoading(true);
        setSaved(false);
        try {
            await axios.post('https://memoiresignaturenumerique.onrender.com/api/admin/config', config, { withCredentials: true });
            setSnackbar({ open: true, message: "✅ Configuration sauvegardée avec succès", severity: 'success' });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            setSnackbar({ open: true, message: "❌ Erreur lors de la sauvegarde", severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 4, color: '#1a237e' }}>
                Configuration système
            </Typography>

            {saved && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
                    Configuration sauvegardée avec succès !
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Configuration PKI */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                            <Security sx={{ color: '#ffc107' }} />
                            <Typography variant="h6" fontWeight="bold">Configuration PKI</Typography>
                            <Chip 
                                label="Certificats X.509" 
                                size="small" 
                                variant="outlined" 
                                sx={{ ml: 1 }}
                            />
                        </Stack>
                        <TextField
                            fullWidth
                            label="Durée de validité du certificat"
                            type="number"
                            value={config.pkiCertificatDureeMinutes}
                            onChange={(e) => setConfig({...config, pkiCertificatDureeMinutes: parseInt(e.target.value)})}
                            sx={{ mb: 2 }}
                            helperText="⏰ Durée de validité des certificats numériques (en minutes)"
                            InputProps={{
                                endAdornment: <Typography variant="caption" color="textSecondary">minutes</Typography>
                            }}
                        />
                        <Alert severity="info" sx={{ mt: 2, borderRadius: '8px' }}>
                            <Typography variant="caption">
                                💡 Un certificat expiré ne peut plus être utilisé pour signer des documents.
                                L'utilisateur devra faire une nouvelle demande.
                            </Typography>
                        </Alert>
                    </Paper>
                </Grid>

                {/* Configuration Signatures */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                            <Email sx={{ color: '#ffc107' }} />
                            <Typography variant="h6" fontWeight="bold">Configuration Signatures</Typography>
                        </Stack>
                        
                        <TextField
                            fullWidth
                            label="Expiration des invitations"
                            type="number"
                            value={config.signatureExpirationJours}
                            onChange={(e) => setConfig({...config, signatureExpirationJours: parseInt(e.target.value)})}
                            sx={{ mb: 3 }}
                            helperText="📅 Nombre de jours avant expiration du lien de signature envoyé par email"
                            InputProps={{
                                endAdornment: <Typography variant="caption" color="textSecondary">jours</Typography>
                            }}
                        />
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                            Notifications
                        </Typography>
                        
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="body2">
                                        <strong>Notifications par email</strong>
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Envoi d'emails pour les invitations et confirmations
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip 
                                        label={config.emailNotifications ? "ACTIVÉ" : "DÉSACTIVÉ"}
                                        size="small"
                                        color={config.emailNotifications ? "success" : "default"}
                                        icon={config.emailNotifications ? <CheckCircle /> : <Cancel />}
                                    />
                                    <Switch 
                                        checked={config.emailNotifications} 
                                        onChange={(e) => setConfig({...config, emailNotifications: e.target.checked})}
                                        color="success"
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="body2">
                                        <strong>Envoi SMS OTP</strong>
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Code de vérification par SMS pour la double authentification
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip 
                                        label={config.smsEnabled ? "ACTIVÉ" : "DÉSACTIVÉ"}
                                        size="small"
                                        color={config.smsEnabled ? "success" : "default"}
                                        icon={config.smsEnabled ? <CheckCircle /> : <Cancel />}
                                    />
                                    <Switch 
                                        checked={config.smsEnabled} 
                                        onChange={(e) => setConfig({...config, smsEnabled: e.target.checked})}
                                        color="success"
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="body2">
                                        <strong>MFA obligatoire</strong>
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Authentification multi-facteurs obligatoire pour tous les utilisateurs
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip 
                                        label={config.mfaObligatoire ? "ACTIVÉ" : "DÉSACTIVÉ"}
                                        size="small"
                                        color={config.mfaObligatoire ? "warning" : "default"}
                                        icon={config.mfaObligatoire ? <CheckCircle /> : <Cancel />}
                                    />
                                    <Switch 
                                        checked={config.mfaObligatoire} 
                                        onChange={(e) => setConfig({...config, mfaObligatoire: e.target.checked})}
                                        color="warning"
                                    />
                                </Box>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Configuration OTP */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                            <Storage sx={{ color: '#ffc107' }} />
                            <Typography variant="h6" fontWeight="bold">Configuration OTP</Typography>
                            <Tooltip title="Paramètres des codes de vérification">
                                <Info sx={{ fontSize: 18, color: '#94a3b8', cursor: 'help' }} />
                            </Tooltip>
                        </Stack>
                        
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Expiration du code OTP"
                                    type="number"
                                    value={config.otpExpirationMinutes || 10}
                                    onChange={(e) => setConfig({...config, otpExpirationMinutes: parseInt(e.target.value)})}
                                    helperText="⏱️ Durée de validité du code OTP (en minutes)"
                                    InputProps={{
                                        endAdornment: <Typography variant="caption" color="textSecondary">minutes</Typography>
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Longueur du code OTP"
                                    type="number"
                                    value={config.otpLongueur || 6}
                                    onChange={(e) => setConfig({...config, otpLongueur: parseInt(e.target.value)})}
                                    helperText="🔢 Nombre de chiffres du code OTP (4 à 8)"
                                    inputProps={{ min: 4, max: 8 }}
                                />
                            </Grid>
                        </Grid>
                        
                        <Alert severity="info" sx={{ mt: 3, borderRadius: '8px' }}>
                            <Typography variant="caption">
                                💡 Les codes OTP sont envoyés par SMS et expirent après le délai configuré.
                                Une fois utilisés, ils ne sont plus valables.
                            </Typography>
                        </Alert>
                    </Paper>
                </Grid>

                {/* Actions */}
                <Grid item xs={12}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button 
                            variant="outlined" 
                            startIcon={<Refresh />} 
                            onClick={fetchConfig}
                            disabled={loading}
                        >
                            Réinitialiser
                        </Button>
                        <Button 
                            variant="contained" 
                            startIcon={<Save />} 
                            onClick={saveConfig} 
                            disabled={loading} 
                            sx={{ bgcolor: '#1a237e', px: 4, py: 1.2 }}
                        >
                            {loading ? "Sauvegarde en cours..." : "Sauvegarder la configuration"}
                        </Button>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ConfigurationView;