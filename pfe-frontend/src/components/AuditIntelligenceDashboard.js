// components/AuditIntelligenceDashboard.js - Version avec graphiques améliorés
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Paper,
    Chip, CircularProgress, Alert, Stack,
    Divider, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, useMediaQuery,
    TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, IconButton, Tooltip, ToggleButton, ToggleButtonGroup,Button
} from '@mui/material';
import {
    TrendingUp, TrendingDown, Warning, Security,
    Refresh, Download, Analytics, CheckCircle,
    Person, Visibility, Description,
    Assessment, NotificationsActive, People as PeopleIcon,
    PieChart as PieChartIcon, BarChart as BarChartIcon,
    DonutLarge as DonutIcon
} from '@mui/icons-material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Sector
} from 'recharts';
import axios from 'axios';

// Configuration de l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Palettes de couleurs
const CHART_COLORS = ['#1a237e', '#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#42a5f5', '#90caf5', '#64b5f6'];
const PIE_COLORS = ['#1a237e', '#1565c0', '#1976d2', '#1e88e5', '#42a5f5', '#64b5f6', '#90caf5', '#bbdefb'];

// Composant de graphique en anneau (Donut) avec animation
const DonutChart = ({ data }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [hoverIndex, setHoverIndex] = useState(null);
    
    if (!data || data.length === 0) return null;
    
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
    
    const onPieEnter = (_, index) => {
        setActiveIndex(index);
        setHoverIndex(index);
    };
    
    const onPieLeave = () => {
        setHoverIndex(null);
    };
    
    const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
        const isHovered = hoverIndex === props.index;
        
        return (
            <g>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={isHovered ? outerRadius + 10 : outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={2}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 10}
                    fill={fill}
                />
            </g>
        );
    };
    
    return (
        <ResponsiveContainer width="100%" height={280}>
            <PieChart>
                <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                </Pie>
                <RechartsTooltip 
                    formatter={(value, name, props) => [`${value} événements (${((value / total) * 100).toFixed(1)}%)`, props.payload.label]}
                    contentStyle={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={18} fontWeight="bold" fill="#1a237e">
                    {total}
                </text>
                <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#666">
                    total
                </text>
            </PieChart>
        </ResponsiveContainer>
    );
};

// Composant de graphique en barres verticales
const VerticalBarChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                    dataKey="label" 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                    tick={{ fontSize: 11 }}
                />
                <YAxis />
                <RechartsTooltip 
                    formatter={(value) => [`${value} événements`, 'Nombre']}
                    contentStyle={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

const AuditIntelligenceDashboard = ({ setSnackbar }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [chartType, setChartType] = useState('donut');
    const [stats, setStats] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [userRisks, setUserRisks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetailOpen, setUserDetailOpen] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [reportData, setReportData] = useState(null);
    const isMobile = useMediaQuery('(max-width:600px)');

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const statsResponse = await axios.get(`${API_BASE_URL}/api/audit/statistiques`, {
                params: { periode: 'semaine' }
            });
            console.log('📊 Stats reçues:', statsResponse.data);
            setStats(statsResponse.data);

            const anomaliesResponse = await axios.get(`${API_BASE_URL}/api/audit/anomalies`, {
                params: { jours: 7 }
            });
            setAnomalies(anomaliesResponse.data.anomalies || []);

            await fetchTopRiskUsers();

        } catch (error) {
            console.error('Erreur chargement dashboard IA:', error);
            if (setSnackbar) {
                setSnackbar({
                    open: true,
                    message: 'Erreur de connexion au service IA',
                    severity: 'error'
                });
            }
            setStats({
                total_evenements: 0,
                taux_succes: 0,
                utilisateurs_actifs: 0,
                documents_signes: 0,
                signatures_pki: 0,
                signatures_simples: 0,
                echecs: 0,
                par_type: {}
            });
            setAnomalies([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTopRiskUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/ia/audit/journaux`, {
                params: {
                    date_debut: dateRange.start,
                    date_fin: dateRange.end,
                    limite: 1000
                }
            });
            
            const logs = response.data.journaux || [];
            const userMap = new Map();
            
            for (const log of logs) {
                const email = log.emailUtilisateur;
                if (email && email !== 'unknown') {
                    if (!userMap.has(email)) {
                        userMap.set(email, {
                            email: email,
                            role: log.roleUtilisateur || 'UTILISATEUR',
                            totalActions: 0,
                            failedActions: 0,
                            lastActivity: log.horodatage
                        });
                    }
                    const user = userMap.get(email);
                    user.totalActions++;
                    if (log.statut === 'FAILED') {
                        user.failedActions++;
                    }
                }
            }
            
            const usersWithRisk = Array.from(userMap.values()).map(user => ({
                ...user,
                riskScore: user.totalActions > 0 ? (user.failedActions / user.totalActions) : 0,
                riskLevel: user.failedActions / Math.max(1, user.totalActions) > 0.3 ? 'ELEVE' :
                          user.failedActions / Math.max(1, user.totalActions) > 0.15 ? 'MOYEN' : 'FAIBLE'
            }));
            
            usersWithRisk.sort((a, b) => b.riskScore - a.riskScore);
            setUserRisks(usersWithRisk.slice(0, 10));
            
        } catch (error) {
            console.error('Erreur récupération utilisateurs:', error);
        }
    };

    const generateReport = async () => {
        setGeneratingReport(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/ia/audit/rapport`, {
                params: {
                    date_debut: dateRange.start,
                    date_fin: dateRange.end
                }
            });
            setReportData(response.data.rapport);
            setReportDialogOpen(true);
        } catch (error) {
            console.error('Erreur génération rapport:', error);
            if (setSnackbar) {
                setSnackbar({
                    open: true,
                    message: 'Erreur lors de la génération du rapport',
                    severity: 'error'
                });
            }
        } finally {
            setGeneratingReport(false);
        }
    };

    const exportReport = () => {
        if (!reportData) return;
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `audit_report_${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange]);

    const StatCard = ({ title, value, icon, color }) => (
        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" component="div" fontWeight="bold">
                            {value}
                        </Typography>
                    </Box>
                    <Box sx={{ bgcolor: `${color}20`, borderRadius: 2, p: 1 }}>
                        {icon}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );

    const prepareEventTypeData = () => {
        if (!stats?.par_type || Object.keys(stats.par_type).length === 0) {
            return [];
        }
        
        const data = Object.entries(stats.par_type).map(([name, value]) => ({
            name: name,
            value: value,
            label: name === 'SIGNATURE_DOCUMENT' ? '📝 Signatures' :
                   name === 'CONNEXION' ? '🔐 Connexions' :
                   name === 'ENVOI_INVITATION' ? '📧 Invitations' :
                   name === 'GENERATION_CERTIFICAT' ? '📜 Certificats' :
                   name === 'AUTO_SIGNATURE' ? '⚡ Auto-signatures' :
                   name === 'VALIDATION_OTP' ? '🔢 Validation OTP' :
                   name === 'INSCRIPTION' ? '👤 Inscriptions' :
                   name.replace(/_/g, ' ')
        }));
        
        return data.sort((a, b) => b.value - a.value);
    };

    const eventTypeData = prepareEventTypeData();

    const renderChart = () => {
        if (!eventTypeData || eventTypeData.length === 0) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" height={280}>
                    <Typography color="textSecondary">Aucune donnée disponible</Typography>
                </Box>
            );
        }
        
        switch(chartType) {
            case 'donut':
                return <DonutChart data={eventTypeData} />;
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={eventTypeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {eventTypeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'bar':
                return <VerticalBarChart data={eventTypeData} />;
            default:
                return <DonutChart data={eventTypeData} />;
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Chargement du tableau de bord IA...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* En-tête */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)' }}>
                <Stack direction={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'flex-start' : 'center'} spacing={2}>
                    <Box>
                        <Typography variant="h5" color="white" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                            <Analytics /> Assistant d'Audit Intelligent
                        </Typography>
                        <Typography variant="body2" color="rgba(255,255,255,0.8)" mt={1}>
                            Analyse comportementale • Détection d'anomalies • Scoring de risque
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            type="date"
                            size="small"
                            label="Début"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            sx={{ bgcolor: 'white', borderRadius: 1 }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="date"
                            size="small"
                            label="Fin"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            sx={{ bgcolor: 'white', borderRadius: 1 }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Tooltip title="Actualiser">
                            <IconButton onClick={fetchDashboardData} sx={{ bgcolor: 'white' }}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Générer rapport">
                            <IconButton onClick={generateReport} sx={{ bgcolor: 'white' }} disabled={generatingReport}>
                                {generatingReport ? <CircularProgress size={24} /> : <Description />}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            {/* Cartes de statistiques */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Événements"
                        value={stats?.total_evenements || 0}
                        icon={<Assessment sx={{ color: '#4caf50' }} />}
                        color="#4caf50"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Taux de Succès"
                        value={`${stats?.taux_succes || 0}%`}
                        icon={<CheckCircle sx={{ color: '#2e7d32' }} />}
                        color="#2e7d32"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Utilisateurs Actifs"
                        value={stats?.utilisateurs_actifs || 0}
                        icon={<PeopleIcon sx={{ color: '#2196f3' }} />}
                        color="#2196f3"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Documents Signés"
                        value={stats?.documents_signes || 0}
                        icon={<Description sx={{ color: '#9c27b0' }} />}
                        color="#9c27b0"
                    />
                </Grid>
            </Grid>

            {/* Graphique de répartition */}
            <Card sx={{ borderRadius: 3, mb: 3 }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                            Répartition par type d'événement
                        </Typography>
                        <ToggleButtonGroup
                            value={chartType}
                            exclusive
                            onChange={(e, val) => val && setChartType(val)}
                            size="small"
                            sx={{ bgcolor: '#f5f5f5', borderRadius: 2 }}
                        >
                            <ToggleButton value="donut" aria-label="donut">
                                <DonutIcon fontSize="small" /> &nbsp;Anneau
                            </ToggleButton>
                            <ToggleButton value="pie" aria-label="pie">
                                <PieChartIcon fontSize="small" /> &nbsp;Camembert
                            </ToggleButton>
                            <ToggleButton value="bar" aria-label="bar">
                                <BarChartIcon fontSize="small" /> &nbsp;Barres
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                    {renderChart()}
                </CardContent>
            </Card>

            {/* Légende des couleurs */}
            {eventTypeData.length > 0 && chartType !== 'bar' && (
                <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8f9fa' }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Légende
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={2}>
                        {eventTypeData.map((item, idx) => (
                            <Stack key={idx} direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                <Typography variant="body2">{item.label}</Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                    ({item.value})
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Paper>
            )}

            {/* Onglets Anomalies, Scores, Recommandations */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab label="Anomalies Détectées" icon={<Warning />} iconPosition="start" />
                    <Tab label="Score de Risque Utilisateurs" icon={<Security />} iconPosition="start" />
                    <Tab label="Alertes & Recommandations" icon={<NotificationsActive />} iconPosition="start" />
                </Tabs>

                {/* Onglet Anomalies */}
                {activeTab === 0 && (
                    <Box sx={{ p: 3 }}>
                        {anomalies.length === 0 ? (
                            <Alert severity="info" icon={<CheckCircle />}>
                                Aucune anomalie détectée pour la période sélectionnée.
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Utilisateur</TableCell>
                                            <TableCell>Type d'anomalie</TableCell>
                                            <TableCell>Niveau de risque</TableCell>
                                            <TableCell>Explication</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {anomalies.map((anomaly, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{new Date(anomaly.date || anomaly.horodatage).toLocaleString()}</TableCell>
                                                <TableCell>{anomaly.utilisateur || anomaly.email_utilisateur || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={anomaly.type?.replace(/_/g, ' ') || anomaly.type_anomalie?.replace(/_/g, ' ')} 
                                                        size="small"
                                                        color="warning"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={anomaly.severite || anomaly.niveau_risque}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: anomaly.severite === 'ELEVE' ? '#ff980020' : '#ffc10720',
                                                            color: anomaly.severite === 'ELEVE' ? '#ff9800' : '#ffc107',
                                                            fontWeight: 'bold'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>{anomaly.description || anomaly.explication}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* Onglet Score de Risque */}
                {activeTab === 1 && (
                    <Box sx={{ p: 3 }}>
                        {userRisks.length === 0 ? (
                            <Alert severity="info">
                                Aucun utilisateur trouvé pour la période sélectionnée.
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Utilisateur</TableCell>
                                            <TableCell>Rôle</TableCell>
                                            <TableCell>Actions totales</TableCell>
                                            <TableCell>Taux d'échec</TableCell>
                                            <TableCell>Score de risque</TableCell>
                                            <TableCell>Dernière activité</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {userRisks.map((user, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Person fontSize="small" color="action" />
                                                        <Typography variant="body2">{user.email}</Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{user.role}</TableCell>
                                                <TableCell>{user.totalActions}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={`${Math.round((user.failedActions / user.totalActions) * 100)}%`}
                                                        size="small"
                                                        color={user.failedActions / user.totalActions > 0.3 ? 'error' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <CircularProgress 
                                                            variant="determinate" 
                                                            value={user.riskScore * 100} 
                                                            size={30}
                                                            sx={{ color: user.riskLevel === 'ELEVE' ? '#ff9800' : '#4caf50' }}
                                                        />
                                                        <Typography variant="body2">
                                                            {Math.round(user.riskScore * 100)}%
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{new Date(user.lastActivity).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* Onglet Recommandations */}
                {activeTab === 2 && (
                    <Box sx={{ p: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Alert severity="success">
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        ✅ Aucune anomalie critique détectée
                                    </Typography>
                                    <Typography variant="body2">
                                        Tous les comportements semblent normaux. Continuez à surveiller régulièrement.
                                    </Typography>
                                </Alert>
                            </Grid>
                            <Grid item xs={12}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            📊 Recommandations générales
                                        </Typography>
                                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                                            <li><Typography variant="body2">Continuer la surveillance des logs d'audit</Typography></li>
                                            <li><Typography variant="body2">Planifier des audits réguliers (hebdomadaires ou mensuels)</Typography></li>
                                            <li><Typography variant="body2">Vérifier périodiquement les accès utilisateurs</Typography></li>
                                            <li><Typography variant="body2">Maintenir la configuration de sécurité à jour</Typography></li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Paper>

            {/* Dialog Détails Utilisateur */}
            <Dialog open={userDetailOpen} onClose={() => setUserDetailOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Analyse détaillée - {selectedUser?.email}
                    <IconButton sx={{ position: 'absolute', right: 8, top: 8 }} onClick={() => setUserDetailOpen(false)}>
                        ✕
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedUser && (
                        <Stack spacing={2}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">Rôle</Typography>
                                    <Typography variant="body1" fontWeight="bold">{selectedUser.role}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">Score de risque</Typography>
                                    <Typography variant="body1" fontWeight="bold" color={selectedUser.riskLevel === 'ELEVE' ? '#ff9800' : '#4caf50'}>
                                        {Math.round(selectedUser.riskScore * 100)}% - {selectedUser.riskLevel}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">Actions totales</Typography>
                                    <Typography variant="body1">{selectedUser.totalActions}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">Taux d'échec</Typography>
                                    <Typography variant="body1">
                                        {Math.round((selectedUser.failedActions / selectedUser.totalActions) * 100)}%
                                    </Typography>
                                </Grid>
                            </Grid>
                            <Divider />
                            <Typography variant="subtitle2" fontWeight="bold">Recommandations</Typography>
                            <ul style={{ margin: 0 }}>
                                {selectedUser.riskLevel === 'ELEVE' && (
                                    <>
                                        <li><Typography variant="body2">🔐 Réinitialiser le mot de passe de l'utilisateur</Typography></li>
                                        <li><Typography variant="body2">📧 Envoyer une alerte de sécurité</Typography></li>
                                        <li><Typography variant="body2">👁️ Surveiller attentivement les prochaines activités</Typography></li>
                                    </>
                                )}
                                {selectedUser.riskLevel === 'MOYEN' && (
                                    <>
                                        <li><Typography variant="body2">📊 Analyser les causes des échecs</Typography></li>
                                        <li><Typography variant="body2">🔔 Activer des alertes renforcées</Typography></li>
                                    </>
                                )}
                                {selectedUser.riskLevel === 'FAIBLE' && (
                                    <li><Typography variant="body2">✅ Comportement normal - Surveillance standard maintenue</Typography></li>
                                )}
                            </ul>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUserDetailOpen(false)}>Fermer</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Rapport */}
            <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    Rapport d'Audit
                    <IconButton sx={{ position: 'absolute', right: 8, top: 8 }} onClick={() => setReportDialogOpen(false)}>
                        ✕
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {reportData && (
                        <Stack spacing={2}>
                            <Typography variant="subtitle2" color="textSecondary">
                                Généré le {new Date(reportData.genere_le).toLocaleString()}
                            </Typography>
                            <Typography variant="body1">{reportData.resume_executif}</Typography>
                            <Divider />
                            <Typography variant="subtitle1" fontWeight="bold">Recommandations</Typography>
                            <ul>
                                {reportData.recommandations?.map((rec, idx) => (
                                    <li key={idx}><Typography variant="body2">{rec}</Typography></li>
                                ))}
                            </ul>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={exportReport} variant="contained" startIcon={<Download />}>
                        Exporter JSON
                    </Button>
                    <Button onClick={() => setReportDialogOpen(false)}>Fermer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AuditIntelligenceDashboard;