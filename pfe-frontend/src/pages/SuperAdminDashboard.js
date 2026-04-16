import React, { useState } from 'react';
import { 
    Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, 
    ListItem, ListItemButton, ListItemIcon, ListItemText, Divider,
    Container, Avatar, IconButton, Stack, Snackbar, Alert,
    useMediaQuery, Badge, Tooltip
} from '@mui/material';
import { 
    Dashboard as DashboardIcon,
    Security as SecurityIcon,
    People as PeopleIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Archive as ArchiveIcon,
    AccessTime as AccessTimeIcon,
    History as HistoryIcon,
    Menu as MenuIcon,
    Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AdminCertificats from '../components/pki/AdminCertificats';
import StatsView from '../components/superadmin/StatsView';
import UtilisateursView from '../components/superadmin/UtilisateursView';
import ConfigurationView from '../components/superadmin/ConfigurationView';
import ArchivesView from '../components/superadmin/ArchivesView';
import HorodatageStatusView from '../components/superadmin/HorodatageStatusView';
import AuditLogsView from '../components/superadmin/AuditLogsView';
import AuditIntelligenceDashboard from '../components/AuditIntelligenceDashboard';

const drawerWidth = 280;

const SuperAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('stats');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    
    // Responsive breakpoints
    const isMobile = useMediaQuery('(max-width:600px)');
    const isTablet = useMediaQuery('(max-width:960px)');
    const isSmallMobile = useMediaQuery('(max-width:380px)');

    const menuItems = [
        { id: 'stats', text: 'Tableau de Bord', icon: <DashboardIcon />, mobileText: 'Stats' },
        { id: 'pki', text: 'Gestion PKI / HSM', icon: <SecurityIcon />, mobileText: 'PKI' },
        { id: 'utilisateurs', text: 'Utilisateurs', icon: <PeopleIcon />, mobileText: 'Users' },
        { id: 'audit', text: 'Journalisation (Audit)', icon: <HistoryIcon />, mobileText: 'Audit' },
                { id: 'audit-ia', text: '🤖 Audit Intelligence', icon: <AnalyticsIcon /> },

        { id: 'archives', text: 'Archivage', icon: <ArchiveIcon />, mobileText: 'Archives' },
        { id: 'horodatage', text: 'Horodatage', icon: <AccessTimeIcon />, mobileText: 'Time' },
        { id: 'reglages', text: 'Configuration Système', icon: <SettingsIcon />, mobileText: 'Config' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/connexion');
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const renderContent = () => {
        const commonProps = { 
            setSnackbar, 
            isMobile: isMobile,
            isTablet: isTablet
        };
        
        switch(activeTab) {
            case 'stats':
                return <StatsView {...commonProps} />;
            case 'pki':
                return <AdminCertificats {...commonProps} />;
            case 'utilisateurs':
                return <UtilisateursView {...commonProps} />;
            case 'audit':
                return <AuditLogsView {...commonProps} />;
            case 'archives':
                return <ArchivesView {...commonProps} />;
            case 'horodatage':
                return <HorodatageStatusView {...commonProps} />;
            case 'reglages':
                return <ConfigurationView {...commonProps} />;
            default:
                return <StatsView {...commonProps} />;
        }
    };

    const drawerContent = (
        <>
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 } }}>
                <Typography 
                    variant="h6" 
                    sx={{ 
                        fontWeight: 'bold', 
                        letterSpacing: 1,
                        fontSize: { xs: '0.9rem', sm: '1.1rem' }
                    }}
                >
                    TRUSTSIGN
                    <Typography 
                        component="span" 
                        sx={{ 
                            fontWeight: 300, 
                            fontSize: '0.6rem',
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        SUPER ADMIN
                    </Typography>
                </Typography>
            </Toolbar>
            <Divider sx={{ bgcolor: 'rgba(0,0,0,0.1)' }} />
            <List sx={{ mt: 1, px: { xs: 1, sm: 2 } }}>
                {menuItems.map((item) => (
                    <ListItem key={item.id} disablePadding>
                        <ListItemButton 
                            selected={activeTab === item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (isMobile) setMobileOpen(false);
                            }}
                            sx={{ 
                                borderRadius: 2,
                                mb: 0.5,
                                py: { xs: 1, sm: 1.5 },
                                '&.Mui-selected': { 
                                    bgcolor: 'rgba(26, 35, 126, 0.08)', 
                                    color: '#1a237e', 
                                    '& .MuiListItemIcon-root': { color: '#1a237e' } 
                                },
                                '&:hover': { bgcolor: 'rgba(26, 35, 126, 0.04)' }
                            }}
                        >
                            <ListItemIcon sx={{ 
                                minWidth: { xs: 36, sm: 40 },
                                color: activeTab === item.id ? '#1a237e' : '#64748b'
                            }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText 
                                primary={isMobile ? item.mobileText : item.text} 
                                primaryTypographyProps={{ 
                                    fontWeight: activeTab === item.id ? 'bold' : 'medium',
                                    fontSize: { xs: '0.8rem', sm: '0.9rem' }
                                }} 
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ flexGrow: 1 }} />
            <Divider sx={{ my: 2 }} />
            <List sx={{ px: { xs: 1, sm: 2 } }}>
                <ListItem disablePadding>
                    <ListItemButton 
                        onClick={handleLogout}
                        sx={{ 
                            borderRadius: 2,
                            py: { xs: 1, sm: 1.5 },
                            color: '#d32f2f',
                            '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.04)' }
                        }}
                    >
                        <ListItemIcon sx={{ color: '#d32f2f', minWidth: { xs: 36, sm: 40 } }}>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Déconnexion" 
                            primaryTypographyProps={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                        />
                    </ListItemButton>
                </ListItem>
            </List>
        </>
    );

    return (
        <Box sx={{ display: 'flex', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
            <CssBaseline />
            
            {/* App Bar - Version mobile avec menu burger */}
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: (theme) => theme.zIndex.drawer + 1, 
                    bgcolor: '#1a237e',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}
            >
                <Toolbar sx={{ 
                    justifyContent: 'space-between', 
                    minHeight: { xs: 56, sm: 64 },
                    px: { xs: 1.5, sm: 2 }
                }}>
                    {/* Menu Burger - visible sur mobile */}
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ display: { xs: 'block', sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    
                    {/* Logo - visible sur tablette et desktop */}
                    <Typography 
                        variant="h6" 
                        noWrap 
                        component="div" 
                        sx={{ 
                            fontWeight: 'bold', 
                            letterSpacing: 1,
                            display: { xs: 'none', sm: 'block' },
                            fontSize: { sm: '1rem', md: '1.25rem' }
                        }}
                    >
                        TRUSTSIGN <Typography component="span" sx={{ fontWeight: 300, fontSize: '0.7rem' }}>| SUPER ADMIN</Typography>
                    </Typography>
                    
                    {/* Titre mobile simplifié */}
                    <Typography 
                        variant="subtitle1" 
                        sx={{ 
                            display: { xs: 'block', sm: 'none' },
                            flexGrow: 1,
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        Admin
                    </Typography>
                    
                    {/* Actions droite */}
                    <Stack direction="row" spacing={isMobile ? 1 : 2} alignItems="center">
                        <Tooltip title="Notifications">
                            <IconButton color="inherit" size={isMobile ? "small" : "medium"}>
                                <Badge badgeContent={3} color="error">
                                    <NotificationsIcon fontSize={isMobile ? "small" : "medium"} />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Profil Administrateur">
                            <Avatar sx={{ 
                                bgcolor: '#ffa000', 
                                width: { xs: 28, sm: 32 }, 
                                height: { xs: 28, sm: 32 }, 
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}>
                                SA
                            </Avatar>
                        </Tooltip>
                        
                        <Tooltip title="Déconnexion">
                            <IconButton color="inherit" onClick={handleLogout} size={isMobile ? "small" : "medium"}>
                                <LogoutIcon fontSize={isMobile ? "small" : "medium"} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer - temporary */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: drawerWidth,
                        bgcolor: '#fff',
                        boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Drawer - permanent */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { 
                        width: drawerWidth, 
                        boxSizing: 'border-box', 
                        borderRight: '1px solid #e0e0e0',
                        bgcolor: '#fff',
                        top: 0,
                        height: '100vh'
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Main Content */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1,
                    width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
                    mt: { xs: '56px', sm: '64px' },
                    p: { xs: 1, sm: 2, md: 3 }
                }}
            >
                <Container 
                    maxWidth={isMobile ? false : "xl"} 
                    disableGutters={isMobile}
                    sx={{ 
                        px: { xs: 1, sm: 2, md: 3 },
                        py: { xs: 1, sm: 2 }
                    }}
                >
                    {renderContent()}
                </Container>
            </Box>

            {/* Snackbar responsive */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar({...snackbar, open: false})}
                anchorOrigin={{ 
                    vertical: 'bottom', 
                    horizontal: isMobile ? 'center' : 'left' 
                }}
                sx={{ 
                    bottom: { xs: 16, sm: 24 },
                    left: { xs: 16, sm: isMobile ? 16 : 24 },
                    right: { xs: 16, sm: 'auto' }
                }}
            >
                <Alert 
                    severity={snackbar.severity} 
                    variant="filled"
                    sx={{ 
                        borderRadius: '12px',
                        width: '100%',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SuperAdminDashboard;