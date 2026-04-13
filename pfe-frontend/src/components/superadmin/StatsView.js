import React, { useState, useEffect } from 'react';
import { 
    Box, Grid, Card, CardContent, Typography, Stack, 
    Avatar, LinearProgress, Paper, Table, TableBody, 
    TableCell, TableContainer, TableHead, TableRow, Chip,
    Tooltip, useMediaQuery
} from '@mui/material';
import { 
    People, Business, Description, Security, 
    TrendingUp, VerifiedUser, Pending, CheckCircle,
    Draw, AutoFixHigh, Fingerprint
} from '@mui/icons-material';
import axios from 'axios';

const StatsView = ({ setSnackbar, isMobile = false, isTablet = false }) => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        actifs: 0,
        inactifs: 0,
        superAdmins: 0,
        adminsEntreprise: 0,
        utilisateurs: 0,
        totalDocuments: 0,
        signes: 0,
        nonSignes: 0,
        pendingCertificates: 0,
        activeCertificates: 0,
        signaturesSimple: 0,
        signaturesPKI: 0,
        signaturesAuto: 0
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersRes, certRes, docsRes, activitiesRes, signaturesRes] = await Promise.all([
                    axios.get('https://memoiresignaturenumerique.onrender.com/api/admin/stats/utilisateurs', { withCredentials: true }),
                    axios.get('https://memoiresignaturenumerique.onrender.com/api/admin/pki/stats', { withCredentials: true }),
                    axios.get('https://memoiresignaturenumerique.onrender.com/api/admin/stats/documents', { withCredentials: true }),
                    axios.get('https://memoiresignaturenumerique.onrender.com/api/admin/stats/activites', { withCredentials: true }),
                    axios.get('https://memoiresignaturenumerique.onrender.com/api/admin/stats/signatures', { withCredentials: true })
                ]);
                
                setStats({
                    totalUsers: usersRes.data.total || 0,
                    actifs: usersRes.data.actifs || 0,
                    inactifs: usersRes.data.inactifs || 0,
                    superAdmins: usersRes.data.superAdmins || 0,
                    adminsEntreprise: usersRes.data.adminsEntreprise || 0,
                    utilisateurs: usersRes.data.utilisateurs || 0,
                    totalDocuments: docsRes.data.total || 0,
                    signes: docsRes.data.signes || 0,
                    nonSignes: docsRes.data.nonSignes || 0,
                    pendingCertificates: certRes.data.pending || 0,
                    activeCertificates: certRes.data.active || 0,
                    signaturesSimple: signaturesRes.data.simple || 0,
                    signaturesPKI: signaturesRes.data.pki || 0,
                    signaturesAuto: signaturesRes.data.auto || 0
                });
                setRecentActivities(activitiesRes.data || []);
            } catch (error) {
                console.error("Erreur chargement stats:", error);
                if (setSnackbar) {
                    setSnackbar({ open: true, message: "Erreur chargement des statistiques", severity: 'error' });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [setSnackbar]);

    const statCards = [
        { title: "Utilisateurs", value: stats.totalUsers, icon: <People />, color: "#1a237e", bg: "#e8eaf6" },
        { title: "Utilisateurs actifs", value: stats.actifs, icon: <CheckCircle />, color: "#2e7d32", bg: "#e8f5e9" },
        { title: "Super Admins", value: stats.superAdmins, icon: <Security />, color: "#d32f2f", bg: "#ffebee" },
        { title: "Documents", value: stats.totalDocuments, icon: <Description />, color: "#00695c", bg: "#e0f2f1" },
        { title: "Documents signés", value: stats.signes, icon: <VerifiedUser />, color: "#2e7d32", bg: "#e8f5e9" },
        { title: "Certificats actifs", value: stats.activeCertificates, icon: <CheckCircle />, color: "#2e7d32", bg: "#e8f5e9" },
        { title: "Certificats en attente", value: stats.pendingCertificates, icon: <Pending />, color: "#ed6c02", bg: "#fff4e5" }
    ];

    const signatureCards = [
        { title: "Signature Simple", value: stats.signaturesSimple, icon: <Draw />, color: "#ff9800", bg: "#fff3e0", description: "Signature manuscrite avec OTP" },
        { title: "Signature PKI", value: stats.signaturesPKI, icon: <Fingerprint />, color: "#4caf50", bg: "#e8f5e9", description: "Signature avec certificat numérique" },
        { title: "Auto-Signature", value: stats.signaturesAuto, icon: <AutoFixHigh />, color: "#2196f3", bg: "#e3f2fd", description: "Signature automatique" }
    ];

    if (loading) return <LinearProgress />;

    return (
        <Box sx={{ px: { xs: 0, sm: 1 } }}>
            <Typography variant={mobile ? "h6" : "h5"} fontWeight="800" sx={{ mb: mobile ? 2 : 4, color: '#1a237e' }}>
                Tableau de bord
            </Typography>
            
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#64748b', fontSize: mobile ? '0.8rem' : '0.9rem' }}>
                Vue d'ensemble
            </Typography>
            <Grid container spacing={mobile ? 2 : 3} sx={{ mb: mobile ? 3 : 5 }}>
                {statCards.map((card, idx) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                        <Card sx={{ borderRadius: '16px', boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: mobile ? 1.5 : 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: mobile ? '0.65rem' : '0.75rem' }}>
                                            {card.title}
                                        </Typography>
                                        <Typography variant={mobile ? "h5" : "h4"} fontWeight="bold" sx={{ color: card.color }}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ bgcolor: card.bg, color: card.color, width: mobile ? 40 : 48, height: mobile ? 40 : 48 }}>
                                        {card.icon}
                                    </Avatar>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#64748b', fontSize: mobile ? '0.8rem' : '0.9rem' }}>
                Répartition des signatures
            </Typography>
            <Grid container spacing={mobile ? 2 : 3} sx={{ mb: mobile ? 3 : 5 }}>
                {signatureCards.map((card, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Tooltip title={card.description} arrow>
                            <Card sx={{ borderRadius: '16px', boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }}>
                                <CardContent sx={{ p: mobile ? 1.5 : 2 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: mobile ? '0.65rem' : '0.75rem' }}>
                                                {card.title}
                                            </Typography>
                                            <Typography variant={mobile ? "h5" : "h4"} fontWeight="bold" sx={{ color: card.color }}>
                                                {card.value}
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: card.bg, color: card.color, width: mobile ? 40 : 48, height: mobile ? 40 : 48 }}>
                                            {card.icon}
                                        </Avatar>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Tooltip>
                    </Grid>
                ))}
            </Grid>

            <Typography variant={mobile ? "subtitle1" : "h6"} fontWeight="bold" sx={{ mb: 2, color: '#1a237e' }}>
                Dernières activités
            </Typography>
            
            {mobile ? (
                // Version mobile - cartes
                <Stack spacing={2}>
                    {recentActivities.length === 0 ? (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">Aucune activité récente</Typography>
                        </Paper>
                    ) : (
                        recentActivities.map((act, idx) => (
                            <Paper key={idx} sx={{ p: 2, borderRadius: '12px' }}>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        {act.typeSignature === 'pki' && <Chip icon={<Fingerprint />} label="PKI" size="small" color="success" variant="outlined" />}
                                        {act.typeSignature === 'simple' && <Chip icon={<Draw />} label="Simple" size="small" color="warning" variant="outlined" />}
                                        {act.typeSignature === 'auto' && <Chip icon={<AutoFixHigh />} label="Auto" size="small" color="info" variant="outlined" />}
                                        {!act.typeSignature && <Chip label="Invitation" size="small" variant="outlined" />}
                                        <Chip label={act.status} size="small" color={act.status === 'Succès' ? 'success' : 'default'} />
                                    </Stack>
                                    <Typography variant="body2" fontWeight="bold">{act.action}</Typography>
                                    <Typography variant="caption" color="textSecondary">{act.user}</Typography>
                                    <Typography variant="caption" color="textSecondary">{new Date(act.date).toLocaleString()}</Typography>
                                </Stack>
                            </Paper>
                        ))
                    )}
                </Stack>
            ) : (
                // Version desktop - tableau
                <TableContainer component={Paper} sx={{ borderRadius: '12px', overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><b>Type</b></TableCell>
                                <TableCell><b>Action</b></TableCell>
                                <TableCell><b>Utilisateur</b></TableCell>
                                <TableCell><b>Date</b></TableCell>
                                <TableCell><b>Statut</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recentActivities.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center">Aucune activité récente</TableCell></TableRow>
                            ) : (
                                recentActivities.map((act, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            {act.typeSignature === 'pki' && <Chip icon={<Fingerprint />} label="PKI" size="small" color="success" variant="outlined" />}
                                            {act.typeSignature === 'simple' && <Chip icon={<Draw />} label="Simple" size="small" color="warning" variant="outlined" />}
                                            {act.typeSignature === 'auto' && <Chip icon={<AutoFixHigh />} label="Auto" size="small" color="info" variant="outlined" />}
                                            {!act.typeSignature && <Chip label="Invitation" size="small" variant="outlined" />}
                                        </TableCell>
                                        <TableCell>{act.action}</TableCell>
                                        <TableCell>{act.user}</TableCell>
                                        <TableCell>{new Date(act.date).toLocaleString()}</TableCell>
                                        <TableCell><Chip label={act.status} size="small" color={act.status === 'Succès' ? 'success' : 'default'} /></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default StatsView;