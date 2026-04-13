import React, { useState } from 'react';
import { 
    Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, 
    ListItem, ListItemButton, ListItemIcon, ListItemText, Divider,
    Container, Avatar, IconButton, Stack, Snackbar, Alert,
    IconButton as MuiIconButton, useMediaQuery
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
    Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AdminCertificats from '../components/pki/AdminCertificats';
import StatsView from '../components/superadmin/StatsView';
import UtilisateursView from '../components/superadmin/UtilisateursView';
import ConfigurationView from '../components/superadmin/ConfigurationView';
import ArchivesView from '../components/superadmin/ArchivesView';
import HorodatageStatusView from '../components/superadmin/HorodatageStatusView';
import AuditLogsView from '../components/superadmin/AuditLogsView';

const drawerWidth = 280;
const miniDrawerWidth = 72;

const SuperAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('stats');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [drawerCollapsed, setDrawerCollapsed] = useState(false);
    const navigate = useNavigate();
    
    // Responsive breakpoints
    const isMobile = useMediaQuery('(max-width:600px)');
    const isTablet = useMediaQuery('(max-width:960px)');
    const isDesktop = useMediaQuery('(min-width:1200px)');

    const menuItems = [
        { id: 'stats', text: 'Tableau de Bord', icon: <DashboardIcon /> },
        { id: 'pki', text: 'Gestion PKI / HSM', icon: <SecurityIcon /> },
        { id: 'utilisateurs', text: 'Utilisateurs', icon: <PeopleIcon /> },
        { id: 'audit', text: 'Journalisation (Audit)', icon: <HistoryIcon /> },
        { id: 'archives', text: 'Archivage', icon: <ArchiveIcon /> },
        { id: 'horodatage', text: 'Horodatage', icon: <AccessTimeIcon /> },
        { id: 'reglages', text: 'Configuration Système', icon: <SettingsIcon /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/connexion');
    };

    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen(!mobileOpen);
        } else {
            setDrawerCollapsed(!drawerCollapsed);
        }
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

    const drawer = (
        <>
            <Toolbar>
                <Typography 
                    variant="h6" 
                    sx={{ 
                        fontWeight: 'bold', 
                        letterSpacing: 1,
                        display: (drawerCollapsed && !isMobile) ? 'none' : 'block'
                    }}
                >
                    TRUSTSIGN
                    {!isMobile && (
                        <Typography 
                            component="span" 
                            sx={{ 
                                fontWeight: 300, 
                                fontSize: '0.7rem',
                                display: 'block'
                            }}
                        >
                            SUPER ADMIN
                        </Typography>
                    )}
                </Typography>
                {!isMobile && (
                    <IconButton 
                        onClick={handleDrawerToggle}
                        sx={{ ml: 'auto' }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
            </Toolbar>
            <Divider />
            <List sx={{ mt: 2 }}>
                {menuItems.map((item) => (
                    <ListItem key={item.id} disablePadding>
                        <ListItemButton 
                            selected={activeTab === item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (isMobile) setMobileOpen(false);
                            }}
                            sx={{ 
                                mx: 1, 
                                borderRadius: 2,
                                justifyContent: (drawerCollapsed && !isMobile) ? 'center' : 'flex-start',
                                px: (drawerCollapsed && !isMobile) ? 2 : 3,
                                '&.Mui-selected': { 
                                    bgcolor: 'rgba(26, 35, 126, 0.08)', 
                                    color: '#1a237e', 
                                    '& .MuiListItemIcon-root': { color: '#1a237e' } 
                                },
                                minHeight: 48
                            }}
                            title={(drawerCollapsed && !isMobile) ? item.text : ''}
                        >
                            <ListItemIcon sx={{ 
                                minWidth: (drawerCollapsed && !isMobile) ? 'auto' : 40,
                                justifyContent: 'center'
                            }}>
                                {item.icon}
                            </ListItemIcon>
                            {(drawerCollapsed && !isMobile) ? null : (
                                <ListItemText 
                                    primary={item.text} 
                                    primaryTypographyProps={{ 
                                        fontWeight: activeTab === item.id ? 'bold' : 'medium',
                                        fontSize: '0.9rem'
                                    }} 
                                />
                            )}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ flexGrow: 1 }} />
            <Divider sx={{ my: 2 }} />
            <List>
                <ListItem disablePadding>
                    <ListItemButton 
                        onClick={handleLogout}
                        sx={{ 
                            mx: 1, 
                            borderRadius: 2,
                            justifyContent: (drawerCollapsed && !isMobile) ? 'center' : 'flex-start',
                            color: '#d32f2f',
                            '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.04)' }
                        }}
                        title={(drawerCollapsed && !isMobile) ? 'Déconnexion' : ''}
                    >
                        <ListItemIcon sx={{ 
                            minWidth: (drawerCollapsed && !isMobile) ? 'auto' : 40,
                            justifyContent: 'center',
                            color: '#d32f2f'
                        }}>
                            <LogoutIcon />
                        </ListItemIcon>
                        {(drawerCollapsed && !isMobile) ? null : (
                            <ListItemText primary="Déconnexion" />
                        )}
                    </ListItemButton>
                </ListItem>
            </List>
        </>
    );

    const drawerWidth_calculated = () => {
        if (isMobile) return 0;
        if (drawerCollapsed) return miniDrawerWidth;
        return drawerWidth;
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
            <CssBaseline />
            
            {/* App Bar */}
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: (theme) => theme.zIndex.drawer + 1, 
                    bgcolor: '#1a237e',
                    width: { sm: `calc(100% - ${drawerWidth_calculated()}px)` },
                    ml: { sm: `${drawerWidth_calculated()}px` }
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'block' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    
                    <Typography 
                        variant="h6" 
                        noWrap 
                        component="div" 
                        sx={{ 
                            fontWeight: 'bold', 
                            letterSpacing: 1,
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        TRUSTSIGN <Typography component="span" sx={{ fontWeight: 300, fontSize: '0.8rem' }}>| SUPER ADMIN</Typography>
                    </Typography>
                    
                    <Typography 
                        variant="subtitle1" 
                        sx={{ 
                            display: { xs: 'block', sm: 'none' },
                            flexGrow: 1
                        }}
                    >
                        TrustSign Admin
                    </Typography>
                    
                    <Stack direction="row" spacing={isMobile ? 1 : 2} alignItems="center">
                        <Avatar sx={{ 
                            bgcolor: '#ffa000', 
                            width: { xs: 28, sm: 32 }, 
                            height: { xs: 28, sm: 32 }, 
                            fontSize: '0.9rem' 
                        }}>
                            SA
                        </Avatar>
                        <IconButton color="inherit" onClick={handleLogout} size={isMobile ? 'small' : 'medium'}>
                            <LogoutIcon />
                        </IconButton>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer */}
            {isMobile && (
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
                            bgcolor: '#fff'
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            )}

            {/* Desktop Drawer */}
            {!isMobile && (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth_calculated(),
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: { 
                            width: drawerWidth_calculated(), 
                            boxSizing: 'border-box', 
                            borderRight: '1px solid #ddd',
                            transition: 'width 0.2s ease',
                            overflowX: 'hidden',
                            bgcolor: '#fff'
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            )}

            {/* Main Content */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: { xs: 1, sm: 2, md: 3 },
                    width: { sm: `calc(100% - ${drawerWidth_calculated()}px)` },
                    mt: '64px'
                }}
            >
                <Container 
                    maxWidth={isDesktop ? "xl" : "lg"} 
                    sx={{ 
                        px: { xs: 1, sm: 2, md: 3 },
                        py: { xs: 2, sm: 3 }
                    }}
                >
                    {renderContent()}
                </Container>
            </Box>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar({...snackbar, open: false})}
                anchorOrigin={{ 
                    vertical: 'bottom', 
                    horizontal: isMobile ? 'center' : 'left' 
                }}
                sx={{ bottom: { xs: 16, sm: 24 } }}
            >
                <Alert 
                    severity={snackbar.severity} 
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SuperAdminDashboard;