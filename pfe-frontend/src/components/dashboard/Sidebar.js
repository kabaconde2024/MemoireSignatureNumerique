import React from 'react';
import { Drawer, Toolbar, List, Typography, ListItemButton, ListItemIcon, ListItemText, Divider, Collapse } from '@mui/material';
import { Draw as DrawIcon, History, CardMembership, AutoFixHigh, PersonOutline, Settings, Edit, Lock, ListAlt, ExpandLess, ExpandMore } from '@mui/icons-material';

const drawerWidth = 280;

const Sidebar = ({ view, setView, openAutoSig, setOpenAutoSig, openProfile, setOpenProfile }) => {
    return (
        <Drawer variant="permanent" sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: '#0b1e39', color: '#fff', borderRight: 'none' } }}>
            <Toolbar sx={{ my: 2, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#ffc107', letterSpacing: '1px' }}>NGSign</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: -0.5 }}>PROTECTED</Typography>
            </Toolbar>
            
            <List sx={{ px: 2 }}>
                <ListItemButton selected={view === 'signatures'} onClick={() => { setView('signatures'); }} sx={{ borderRadius: '8px', mb: 1, '&.Mui-selected': { bgcolor: 'rgba(255, 193, 7, 0.2)' } }}>
                    <ListItemIcon sx={{ color: view === 'signatures' ? '#ffc107' : '#94a3b8' }}><DrawIcon /></ListItemIcon>
                    <ListItemText primary="Signer un document" />
                </ListItemButton>

                <ListItemButton selected={view === 'transactions'} onClick={() => setView('transactions')} sx={{ borderRadius: '8px', mb: 1 }}>
                    <ListItemIcon sx={{ color: view === 'transactions' ? '#ffc107' : '#94a3b8' }}><History /></ListItemIcon>
                    <ListItemText primary="Mes transactions" />
                </ListItemButton>

                <ListItemButton selected={view === 'certificat'} onClick={() => setView('certificat')} sx={{ borderRadius: '8px', mb: 1 }}>
                    <ListItemIcon sx={{ color: view === 'certificat' ? '#ffc107' : '#94a3b8' }}><CardMembership /></ListItemIcon>
                    <ListItemText primary="Mon Certificat PKI" />
                </ListItemButton>

                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                <ListItemButton onClick={() => setOpenAutoSig(!openAutoSig)} sx={{ borderRadius: '8px', mb: 1 }}>
                    <ListItemIcon sx={{ color: '#94a3b8' }}><AutoFixHigh /></ListItemIcon>
                    <ListItemText primary="Auto-Signature PDF" />
                    {openAutoSig ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={openAutoSig}>
                    <List component="div" disablePadding>
                        <ListItemButton selected={view === 'auto-signature'} onClick={() => setView('auto-signature')} sx={{ ml: 2, borderRadius: '8px' }}>
                            <ListItemIcon sx={{ color: view === 'auto-signature' ? '#ffc107' : '#64748b', minWidth: 40 }}><Edit fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Signer maintenant" />
                        </ListItemButton>
                        <ListItemButton selected={view === 'liste-auto-signe'} onClick={() => setView('liste-auto-signe')} sx={{ ml: 2, borderRadius: '8px' }}>
                            <ListItemIcon sx={{ color: view === 'liste-auto-signe' ? '#ffc107' : '#64748b', minWidth: 40 }}><ListAlt fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Documents auto-signés" />
                        </ListItemButton>
                    </List>
                </Collapse>

                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                <ListItemButton onClick={() => setOpenProfile(!openProfile)} sx={{ borderRadius: '8px', mb: 1 }}>
                    <ListItemIcon sx={{ color: '#94a3b8' }}><PersonOutline /></ListItemIcon>
                    <ListItemText primary="Mon profil" />
                    {openProfile ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={openProfile}>
                    <List component="div" disablePadding>
                        <ListItemButton selected={view === 'mes-informations'} onClick={() => setView('mes-informations')} sx={{ ml: 2, borderRadius: '8px' }}>
                            <ListItemIcon sx={{ color: view === 'mes-informations' ? '#ffc107' : '#64748b', minWidth: 40 }}><Settings fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Informations" />
                        </ListItemButton>
                        <ListItemButton selected={view === 'securite'} onClick={() => setView('securite')} sx={{ ml: 2, borderRadius: '8px' }}>
                            <ListItemIcon sx={{ color: view === 'securite' ? '#ffc107' : '#64748b', minWidth: 40 }}><Lock fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Sécurité" />
                        </ListItemButton>
                        <ListItemButton selected={view === 'ma-signature'} onClick={() => setView('ma-signature')} sx={{ ml: 2, borderRadius: '8px' }}>
                            <ListItemIcon sx={{ color: view === 'ma-signature' ? '#ffc107' : '#64748b', minWidth: 40 }}><DrawIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Ma signature" />
                        </ListItemButton>
                    </List>
                </Collapse>
            </List>
        </Drawer>
    );
};

export default Sidebar;