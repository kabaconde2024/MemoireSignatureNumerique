// components/dashboard/CertificatView.jsx
import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, Chip, Alert, Card, CardContent, Grid, LinearProgress } from '@mui/material';
import { CardMembership, Download, HourglassBottom, Refresh, CheckCircle, Pending, Error as ErrorIcon, Info } from '@mui/icons-material';
import axios from 'axios';

const CertificatView = ({ currentStatus, onStatusRefresh, setSnackbar }) => {
    const [loading, setLoading] = useState(false);
    const [renewLoading, setRenewLoading] = useState(false);
    const [certInfo, setCertInfo] = useState(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const fetchCertificat = async () => {
            if (currentStatus === 'ACTIVE') {
                try {
                    const res = await axios.get('https://memoiresignaturenumerique.onrender.com/api/utilisateur/pki/mon-statut', {
                        withCredentials: true
                    });
                    setCertInfo(res.data);
                    if (res.data.dateExpiration) {
                        const expirationDate = new Date(res.data.dateExpiration);
                        const now = new Date();
                        setIsExpired(expirationDate < now);
                    }
                } catch (err) {
                    console.error("Erreur certificat:", err);
                }
            } else {
                setCertInfo(null);
                setIsExpired(false);
            }
        };
        fetchCertificat();
    }, [currentStatus]);

    const handleRequest = async () => {
        setLoading(true);
        try {
            const response = await axios.post('https://memoiresignaturenumerique.onrender.com/api/utilisateur/pki/request-certificate', {}, { withCredentials: true });
            setSnackbar({ 
                open: true, 
                message: "✅ Votre demande de certificat a été transmise avec succès. Un administrateur va traiter votre demande dans les plus brefs délais.", 
                severity: 'success' 
            });
            if (onStatusRefresh) onStatusRefresh();
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.erreur || "Une erreur est survenue lors de la demande";
            setSnackbar({ open: true, message: `❌ ${errorMsg}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        setRenewLoading(true);
        try {
            const response = await axios.post('https://memoiresignaturenumerique.onrender.com/api/utilisateur/pki/renouveler-certificat', {}, { withCredentials: true });
            setSnackbar({ 
                open: true, 
                message: "✅ Votre demande de renouvellement a été enregistrée. L'administrateur va traiter votre demande.", 
                severity: 'success' 
            });
            if (onStatusRefresh) onStatusRefresh();
        } catch (error) {
            setSnackbar({ 
                open: true, 
                message: `❌ ${error.response?.data?.message || "Erreur lors du renouvellement"}`, 
                severity: 'error' 
            });
        } finally {
            setRenewLoading(false);
        }
    };

    const handleDownload = () => {
        if (certInfo?.certificatPem) {
            const file = new Blob([certInfo.certificatPem], { type: 'text/plain' });
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = "certificat_trustsign.pem";
            link.click();
            URL.revokeObjectURL(url);
            setSnackbar({ open: true, message: "📄 Téléchargement du certificat démarré", severity: 'info' });
        }
    };

    const formaterDate = (dateSource) => {
        if (!dateSource) return "Non définie";
        try {
            const date = new Date(dateSource);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
            }
            return "Date invalide";
        } catch (e) {
            return "Non disponible";
        }
    };

    const getDaysUntilExpiration = () => {
        if (!certInfo?.dateExpiration) return null;
        const expiration = new Date(certInfo.dateExpiration);
        const now = new Date();
        const diffTime = expiration - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilExpiration = getDaysUntilExpiration();
    const isNearExpiration = daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0;

    const isActive = currentStatus === 'ACTIVE';
    const isPending = currentStatus === 'PENDING';
    const isExpiredStatus = currentStatus === 'EXPIRED';
    const isNone = !currentStatus || currentStatus === 'NONE' || currentStatus === 'null' || currentStatus === '' || currentStatus === null;
    const showExpired = (isActive && isExpired) || isExpiredStatus;

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%' }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: '24px', border: '1px solid #E2E8F0', bgcolor: '#ffffff' }}>
                
                {/* En-tête */}
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <Box sx={{ bgcolor: '#fef3c7', p: 1.5, borderRadius: '16px' }}>
                        <CardMembership sx={{ color: '#ffc107', fontSize: 32 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight="800" sx={{ color: '#1a237e' }}>
                            Certificat Numérique X.509
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                            Identité numérique certifiée - Conformité ISO 27005
                        </Typography>
                    </Box>
                </Stack>

                {/* Carte principale */}
                <Card sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    
                    {/* Statut */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 600 }}>
                            Statut du certificat
                        </Typography>
                        <Chip
                            icon={showExpired ? <ErrorIcon /> : isActive ? <CheckCircle /> : isPending ? <Pending /> : <Info />}
                            label={showExpired ? "EXPIRÉ" : isActive ? "ACTIF" : isPending ? "EN ATTENTE" : "NON GÉNÉRÉ"}
                            color={showExpired ? "error" : isActive ? "success" : isPending ? "warning" : "default"}
                            sx={{ fontWeight: 'bold', px: 1, '& .MuiChip-icon': { color: 'inherit' } }}
                        />
                    </Box>

                    {/* Message d'information selon statut */}
                    {isActive && !showExpired && (
                        <Alert 
                            severity="success" 
                            sx={{ mb: 3, borderRadius: '12px' }}
                            icon={<CheckCircle />}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">Certificat actif</Typography>
                            <Typography variant="body2">
                                Votre certificat numérique est valide et opérationnel. Vous pouvez signer des documents avec votre clé privée sécurisée.
                            </Typography>
                        </Alert>
                    )}

                    {isPending && (
                        <Alert 
                            severity="warning" 
                            sx={{ mb: 3, borderRadius: '12px' }}
                            icon={<Pending />}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">Demande en cours de traitement</Typography>
                            <Typography variant="body2">
                                Votre demande de certificat a été soumise à l'autorité de certification (CA). 
                                Un administrateur va vérifier votre identité et signer votre certificat.
                                Vous recevrez une notification une fois le processus terminé.
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress sx={{ borderRadius: '10px', height: 6 }} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#856404' }}>
                                    ⏳ Délai moyen de traitement : 24-48 heures
                                </Typography>
                            </Box>
                        </Alert>
                    )}

                    {showExpired && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 3, borderRadius: '12px' }}
                            icon={<ErrorIcon />}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">Certificat expiré</Typography>
                            <Typography variant="body2">
                                Votre certificat a expiré le <strong>{formaterDate(certInfo?.dateExpiration)}</strong>.
                                Pour continuer à signer des documents de manière sécurisée, vous devez renouveler votre certificat.
                            </Typography>
                        </Alert>
                    )}

                    {isNone && (
                        <Alert 
                            severity="info" 
                            sx={{ mb: 3, borderRadius: '12px' }}
                            icon={<Info />}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">Aucun certificat généré</Typography>
                            <Typography variant="body2">
                                Vous n'avez pas encore de certificat numérique. La demande est simple et rapide :
                                cliquez sur le bouton ci-dessous pour initier le processus.
                            </Typography>
                        </Alert>
                    )}

                    {/* Informations certificat actif */}
                    {isActive && !showExpired && certInfo && (
                        <Box sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ bgcolor: '#ffffff', p: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                            📅 Date d'émission
                                        </Typography>
                                        <Typography variant="body2" fontWeight="600" sx={{ color: '#1e293b' }}>
                                            {formaterDate(certInfo.dateEmission)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ bgcolor: '#ffffff', p: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                            ⏰ Date d'expiration
                                        </Typography>
                                        <Typography variant="body2" fontWeight="600" sx={{ color: isNearExpiration ? '#d32f2f' : '#1e293b' }}>
                                            {formaterDate(certInfo.dateExpiration)}
                                            {isNearExpiration && (
                                                <Chip 
                                                    label={`Expire dans ${daysUntilExpiration} jour${daysUntilExpiration > 1 ? 's' : ''}`} 
                                                    size="small" 
                                                    color="warning" 
                                                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                                />
                                            )}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* Actions selon statut */}
                    {showExpired && (
                        <Box textAlign="center" py={2}>
                            <Button
                                variant="contained"
                                onClick={handleRenew}
                                disabled={renewLoading}
                                startIcon={renewLoading ? <HourglassBottom /> : <Refresh />}
                                sx={{
                                    bgcolor: '#ffc107',
                                    color: '#0b1e39',
                                    fontWeight: 'bold',
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: '12px',
                                    '&:hover': { bgcolor: '#e6af06' }
                                }}
                            >
                                {renewLoading ? "Traitement en cours..." : "🔄 Renouveler mon certificat"}
                            </Button>
                            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#64748b' }}>
                                Le renouvellement sera soumis à l'approbation de l'autorité de certification
                            </Typography>
                        </Box>
                    )}

                    {isNone && (
                        <Box textAlign="center" py={2}>
                            <Button
                                variant="contained"
                                onClick={handleRequest}
                                disabled={loading}
                                startIcon={loading ? <HourglassBottom /> : <CardMembership />}
                                sx={{
                                    bgcolor: '#ffc107',
                                    color: '#0b1e39',
                                    fontWeight: 'bold',
                                    px: 5,
                                    py: 1.5,
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    '&:hover': { bgcolor: '#e6af06' }
                                }}
                            >
                                {loading ? "Génération de la demande..." : "📜 Demander mon certificat numérique"}
                            </Button>
                            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#64748b' }}>
                                La demande sera traitée par l'autorité de certification (CA)
                            </Typography>
                        </Box>
                    )}

                    {isActive && !showExpired && certInfo && (
                        <Stack spacing={2}>
                            <Button
                                variant="outlined"
                                startIcon={<Download />}
                                onClick={handleDownload}
                                fullWidth
                                sx={{
                                    borderColor: '#0b1e39',
                                    color: '#0b1e39',
                                    fontWeight: 'bold',
                                    py: 1.5,
                                    borderRadius: '12px',
                                    '&:hover': { bgcolor: '#f5f5f5', borderColor: '#1a237e' }
                                }}
                            >
                                Télécharger mon certificat public (.pem)
                            </Button>
                            <Typography variant="caption" sx={{ textAlign: 'center', color: '#64748b' }}>
                                Ce certificat public peut être partagé pour vérifier vos signatures
                            </Typography>
                        </Stack>
                    )}

                    {isPending && (
                        <Box textAlign="center" pt={1}>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Besoin d'aide ? Contactez le support à l'adresse support@trustsign.com
                            </Typography>
                        </Box>
                    )}

                </Card>

                {/* Pied de page */}
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        🛡️ Infrastructure PKI sécurisée - Conformité eIDAS et ISO 27005
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default CertificatView;