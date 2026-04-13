import React from 'react';
import { Drawer, Toolbar, List, Typography, ListItemButton, ListItemIcon, ListItemText, Divider, Collapse, IconButton, Box, useMediaQuery } from '@mui/material';
import { Draw as DrawIcon, History, CardMembership, AutoFixHigh, PersonOutline, Settings, Edit, Lock, ListAlt, ExpandLess, ExpandMore, Menu as MenuIcon } from '@mui/icons-material';

const drawerWidth = 280;
const miniDrawerWidth = 70;

const Sidebar = ({ view, setView, openAutoSig, setOpenAutoSig, openProfile, setOpenProfile, mobileOpen, handleDrawerToggle, isMobile = false, isTablet = false }) => {
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    const drawerContent = (
        <>
            <Toolbar sx={{ my: 2, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#ffc107', letterSpacing: '1px', fontSize: { xs: '1rem', sm: '1.25rem' } }}>NGSign</Typography>
                {!mobile && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: -0.5 }}>PROTECTED</Typography>}
            </Toolbar>
            
            <List sx={{ px: { xs: 1, sm: 2 } }}>
                <ListItemButton selected={view === 'signatures'} onClick={() => { setView('signatures'); }} sx={{ borderRadius: '8px', mb: 1, py: { xs: 1, sm: 1.5 } }}>
                    <ListItemIcon sx={{ color: view === 'signatures' ? '#ffc107' : '#94a3b8', minWidth: { xs: 35, sm: 40 } }}><DrawIcon /></ListItemIcon>
                    <ListItemText primary="Signer un document" primaryTypographyProps={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }} />
                </ListItemButton>

                <ListItemButton selected={view === 'transactions'} onClick={() => setView('transactions')} sx={{ borderRadius: '8px', mb: 1, py: { xs: 1, sm: 1.5 } }}>
                    <ListItemIcon sx={{ color: view === 'transactions' ? '#ffc107' : '#94a3b8', minWidth: { xs: 35, sm: 40 } }}><History /></ListItemIcon>
                    <ListItemText primary="Mes transactions" primaryTypographyProps={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }} />
                </ListItemButton>

                <ListItemButton selected={view === 'certificat'} onClick={() => setView('certificat')} sx={{ borderRadius: '8px', mb: 1, py: { xs: 1, sm: 1.5 } }}>
                    <ListItemIcon sx={{ color: view === 'certificat' ? '#ffc107' : '#94a3b8', minWidth: { xs: 35, sm: 40 } }}><CardMembership /></ListItemIcon>
                    <ListItemText primary="Mon Certificat PKI" primaryTypographyProps={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }} />
                </ListItemButton>

                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                <ListItemButton onClick={() => setOpenAutoSig(!openAutoSig)} sx={{ borderRadius: '8px', mb: 1, py: { xs: 1, sm: 1.5 } }}>
                    <ListItemIcon sx={{ color: '#94a3b8', minWidth: { xs: 35, sm: 40 } }}><AutoFixHigh /></ListItemIcon>
                    <ListItemText primary="Auto-Signature PDF" primaryTypographyProps={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }} />
                    {openAutoSig ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={openAutoSig}>
                    <List component="div" disablePadding>
                        <ListItemButton selected={view === 'auto-signature'} onClick={() => setView('auto-signature')} sx={{ ml: 2, borderRadius: '8px', py: { xs: 1, sm: 1.5 } }}>
                            <ListItemIcon sx={{ color: view === 'auto-signature' ? '#ffc107' : '#64748b', minWidth: { xs: 30, sm: 40 } }}><Edit fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Signer maintenant" primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                        </ListItemButton>
                        <ListItemButton selected={view === 'liste-auto-signe'} onClick={() => setView('liste-auto-signe')} sx={{ ml: 2, borderRadius: '8px', py: { xs: 1, sm: 1.5 } }}>
                            <ListItemIcon sx={{ color: view === 'liste-auto-signe' ? '#ffc107' : '#64748b', minWidth: { xs: 30, sm: 40 } }}><ListAlt fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Documents auto-signés" primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                        </ListItemButton>
                    </List>
                </Collapse>

                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                <ListItemButton onClick={() => setOpenProfile(!openProfile)} sx={{ borderRadius: '8px', mb: 1, py: { xs: 1, sm: 1.5 } }}>
                    <ListItemIcon sx={{ color: '#94a3b8', minWidth: { xs: 35, sm: 40 } }}><PersonOutline /></ListItemIcon>
                    <ListItemText primary="Mon profil" primaryTypographyProps={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }} />
                    {openProfile ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={openProfile}>
                    <List component="div" disablePadding>
                        <ListItemButton selected={view === 'mes-informations'} onClick={() => setView('mes-informations')} sx={{ ml: 2, borderRadius: '8px', py: { xs: 1, sm: 1.5 } }}>
                            <ListItemIcon sx={{ color: view === 'mes-informations' ? '#ffc107' : '#64748b', minWidth: { xs: 30, sm: 40 } }}><Settings fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Informations" primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                        </ListItemButton>
                        <ListItemButton selected={view === 'securite'} onClick={() => setView('securite')} sx={{ ml: 2, borderRadius: '8px', py: { xs: 1, sm: 1.5 } }}>
                            <ListItemIcon sx={{ color: view === 'securite' ? '#ffc107' : '#64748b', minWidth: { xs: 30, sm: 40 } }}><Lock fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Sécurité" primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                        </ListItemButton>
                        <ListItemButton selected={view === 'ma-signature'} onClick={() => setView('ma-signature')} sx={{ ml: 2, borderRadius: '8px', py: { xs: 1, sm: 1.5 } }}>
                            <ListItemIcon sx={{ color: view === 'ma-signature' ? '#ffc107' : '#64748b', minWidth: { xs: 30, sm: 40 } }}><DrawIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Ma signature" primaryTypographyProps={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                        </ListItemButton>
                    </List>
                </Collapse>
            </List>
        </>
    );

    if (mobile) {
        return (
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{ '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: '#0b1e39', color: '#fff', borderRight: 'none' } }}
            >
                {drawerContent}
            </Drawer>
        );
    }

    return (
        <Drawer variant="permanent" sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: '#0b1e39', color: '#fff', borderRight: 'none' } }}>
            {drawerContent}
        </Drawer>
    );
};

export default Sidebar;