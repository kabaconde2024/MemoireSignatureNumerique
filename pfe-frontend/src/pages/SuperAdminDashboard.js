// pages/SuperAdminDashboard.js - MODIFIÉ
import React, { useState } from 'react';
import { 
    Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, 
    ListItem, ListItemButton, ListItemIcon, ListItemText, Divider,
    Container, Avatar, IconButton, Stack, Snackbar, Alert
} from '@mui/material';
import { 
    Dashboard as DashboardIcon,
    Security as SecurityIcon,
    People as PeopleIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Archive as ArchiveIcon,
    AccessTime as AccessTimeIcon,
    History as HistoryIcon        // ✅ AJOUTÉ pour l'audit
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AdminCertificats from '../components/pki/AdminCertificats';
import StatsView from '../components/superadmin/StatsView';
import UtilisateursView from '../components/superadmin/UtilisateursView';
import ConfigurationView from '../components/superadmin/ConfigurationView';
import ArchivesView from '../components/superadmin/ArchivesView';
import HorodatageStatusView from '../components/superadmin/HorodatageStatusView';
import AuditLogsView from '../components/superadmin/AuditLogsView';      // ✅ NOUVEAU - À créer

const drawerWidth = 280;

const SuperAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('stats');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();

    const menuItems = [
        { id: 'stats', text: 'Tableau de Bord', icon: <DashboardIcon /> },
        { id: 'pki', text: 'Gestion PKI / HSM', icon: <SecurityIcon /> },
        { id: 'utilisateurs', text: 'Utilisateurs', icon: <PeopleIcon /> },
        { id: 'audit', text: 'Journalisation (Audit)', icon: <HistoryIcon /> },      // ✅ NOUVEAU
        { id: 'archives', text: 'Archivage', icon: <ArchiveIcon /> },
        { id: 'horodatage', text: 'Horodatage', icon: <AccessTimeIcon /> },
        { id: 'reglages', text: 'Configuration Système', icon: <SettingsIcon /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/connexion');
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'stats':
                return <StatsView setSnackbar={setSnackbar} />;
            case 'pki':
                return <AdminCertificats setSnackbar={setSnackbar} />;
            case 'utilisateurs':
                return <UtilisateursView setSnackbar={setSnackbar} />;
            case 'audit':                                    // ✅ NOUVEAU
                return <AuditLogsView setSnackbar={setSnackbar} />;
            case 'archives':
                return <ArchivesView setSnackbar={setSnackbar} />;
            case 'horodatage':
                return <HorodatageStatusView setSnackbar={setSnackbar} />;
            case 'reglages':
                return <ConfigurationView setSnackbar={setSnackbar} />;
            default:
                return <StatsView setSnackbar={setSnackbar} />;
        }
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
            <CssBaseline />
            
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1a237e' }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                        TRUSTSIGN <Typography component="span" sx={{ fontWeight: 300, fontSize: '0.8rem' }}>| SUPER ADMIN</Typography>
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: '#ffa000', width: 32, height: 32, fontSize: '0.9rem' }}>SA</Avatar>
                        <IconButton color="inherit" onClick={handleLogout}>
                            <LogoutIcon />
                        </IconButton>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #ddd' } }}>
                <Toolbar />
                <Box sx={{ overflow: 'auto', mt: 2 }}>
                    <List>
                        {menuItems.map((item) => (
                            <ListItem key={item.id} disablePadding>
                                <ListItemButton 
                                    selected={activeTab === item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    sx={{ mx: 1, borderRadius: 2, '&.Mui-selected': { bgcolor: 'rgba(26, 35, 126, 0.08)', color: '#1a237e', '& .MuiListItemIcon-root': { color: '#1a237e' } } }}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: activeTab === item.id ? 'bold' : 'medium' }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Container maxWidth="lg">
                    {renderContent()}
                </Container>
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default SuperAdminDashboard;