// components/superadmin/HorodatageStatusView.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, Card, CardContent, Button,
    Chip, CircularProgress, Alert, Stack, Divider, TextField
} from '@mui/material';
import {
    AccessTime as AccessTimeIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    Security as SecurityIcon,
    Verified as VerifiedIcon
} from '@mui/icons-material';
import axios from 'axios';

const HorodatageStatusView = ({ setSnackbar }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testData, setTestData] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/horodatage/statut', {
                withCredentials: true
            });
            setStatus(response.data);
        } catch (error) {
            console.error("Erreur:", error);
            setSnackbar({ open: true, message: "Erreur lors du chargement du statut", severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const testerHorodatage = async () => {
        setTesting(true);
        try {
            const response = await axios.post('https://memoiresignaturenumerique.onrender.com/api/horodatage/tester', 
                { data: testData || "Test automatique" },
                { withCredentials: true }
            );
            setTestResult(response.data);
            setSnackbar({ 
                open: true, 
                message: response.data.success ? "Test réussi ✅" : "Test échoué ❌", 
                severity: response.data.success ? 'success' : 'error' 
            });
        } catch (error) {
            setTestResult({ success: false, message: error.message });
            setSnackbar({ open: true, message: "Erreur lors du test", severity: 'error' });
        } finally {
            setTesting(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Grid container spacing={3}>
                {/* Statut du service */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Statut du service
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={2}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography>État du service :</Typography>
                                <Chip
                                    icon={status?.enabled ? <CheckCircleIcon /> : <ErrorIcon />}
                                    label={status?.enabled ? "Actif" : "Inactif"}
                                    color={status?.enabled ? "success" : "error"}
                                />
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography>URL TSA :</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{status?.tsaUrl}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography>Certificats :</Typography>
                                <Chip
                                    icon={status?.certificatsCharges ? <CheckCircleIcon /> : <ErrorIcon />}
                                    label={status?.certificatsCharges ? "Chargés" : "Non chargés"}
                                    color={status?.certificatsCharges ? "success" : "warning"}
                                />
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography>Connexion TSA :</Typography>
                                <Chip
                                    icon={status?.connecte ? <CheckCircleIcon /> : <ErrorIcon />}
                                    label={status?.connecte ? "Connectée" : "Déconnectée"}
                                    color={status?.connecte ? "success" : "error"}
                                />
                            </Box>
                        </Stack>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchStatus}
                            sx={{ mt: 3 }}
                            fullWidth
                        >
                            Actualiser
                        </Button>
                    </Paper>
                </Grid>

                {/* Test d'horodatage */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            <VerifiedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Test du service
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={2}>
                            <TextField
                                label="Données à horodater (optionnel)"
                                value={testData}
                                onChange={(e) => setTestData(e.target.value)}
                                size="small"
                                fullWidth
                                placeholder="Laisser vide pour un test automatique"
                            />
                            <Button
                                variant="contained"
                                onClick={testerHorodatage}
                                disabled={testing}
                                startIcon={testing ? <CircularProgress size={20} /> : <SecurityIcon />}
                                fullWidth
                            >
                                Tester l'horodatage
                            </Button>
                            {testResult && (
                                <Alert severity={testResult.success ? "success" : "error"} sx={{ mt: 2 }}>
                                    <Typography variant="body2" fontWeight="bold">
                                        {testResult.message}
                                    </Typography>
                                    {testResult.valide !== undefined && (
                                        <Typography variant="caption">
                                            Token valide : {testResult.valide ? "✅ Oui" : "❌ Non"}
                                        </Typography>
                                    )}
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                </Grid>

                {/* Documentation */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            📚 Documentation horodatage
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2" color="textSecondary" paragraph>
                            L'horodatage permet d'apporter la preuve qu'un document existait à une date/heure précise.
                            Conformité avec les standards RFC 3161 (TSA) et les exigences eIDAS/ANSI.
                        </Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Chip label="RFC 3161" size="small" variant="outlined" />
                            <Chip label="SHA-256" size="small" variant="outlined" />
                            <Chip label="eIDAS compliant" size="small" variant="outlined" />
                            <Chip label="ANSI Tunisie" size="small" variant="outlined" />
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default HorodatageStatusView;