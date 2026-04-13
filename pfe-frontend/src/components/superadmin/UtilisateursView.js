import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Chip, 
    TextField, InputAdornment, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Stack, Avatar, MenuItem, Tooltip, useMediaQuery, Card, CardContent
} from '@mui/material';
import { Search, Edit, Block, CheckCircle, Refresh, Add, Security } from '@mui/icons-material';
import axios from 'axios';

const UtilisateursView = ({ setSnackbar, isMobile = false, isTablet = false }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [roles] = useState(['UTILISATEUR', 'ADMIN_ENTREPRISE', 'EMPLOYE', 'SUPER_ADMIN']);
    
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/admin/utilisateurs', { withCredentials: true });
            setUsers(response.data);
            setFilteredUsers(response.data);
        } catch (error) {
            console.error("Erreur:", error);
            setSnackbar({ open: true, message: "Erreur chargement utilisateurs", severity: 'error' });
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    useEffect(() => {
        const filtered = users.filter(user =>
            user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchTerm, users]);

    const handleRoleChange = async () => {
        if (!selectedUser || !newRole) return;
        try {
            await axios.put(`https://memoiresignaturenumerique.onrender.com/api/admin/utilisateurs/${selectedUser.id}/role`, { role: newRole }, { withCredentials: true });
            setSnackbar({ open: true, message: `Rôle de ${selectedUser.prenom} ${selectedUser.nom} mis à jour`, severity: 'success' });
            setOpenDialog(false);
            fetchUsers();
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur mise à jour rôle", severity: 'error' });
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'ACTIF' ? 'INACTIF' : 'ACTIF';
        try {
            await axios.put(`https://memoiresignaturenumerique.onrender.com/api/admin/utilisateurs/${userId}/status`, { statut: newStatus }, { withCredentials: true });
            setSnackbar({ open: true, message: `Compte ${newStatus === 'ACTIF' ? 'activé' : 'désactivé'}`, severity: 'success' });
            fetchUsers();
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur modification statut", severity: 'error' });
        }
    };

    const getRoleColor = (role) => {
        switch(role) { case 'SUPER_ADMIN': return 'error'; case 'ADMIN_ENTREPRISE': return 'warning'; case 'EMPLOYE': return 'info'; default: return 'default'; }
    };

    const getCertificatStatus = (user) => {
        if (user.status_pki === 'ACTIVE') return { label: 'Actif', color: 'success', tooltip: 'Certificat actif' };
        else if (user.status_pki === 'PENDING') return { label: 'En attente', color: 'warning', tooltip: 'Demande en attente' };
        else if (user.status_pki === 'EXPIRED') return { label: 'Expiré', color: 'error', tooltip: 'Certificat expiré' };
        else return { label: 'Non généré', color: 'default', tooltip: 'Aucun certificat' };
    };

    return (
        <Box sx={{ px: { xs: 0, sm: 1 } }}>
            <Stack direction={mobile ? "column" : "row"} justifyContent="space-between" alignItems={mobile ? "stretch" : "center"} sx={{ mb: mobile ? 2 : 4 }} spacing={2}>
                <Typography variant={mobile ? "h6" : "h5"} fontWeight="800" sx={{ color: '#1a237e' }}>Gestion des utilisateurs</Typography>
                <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#1a237e' }} fullWidth={mobile}>Nouvel utilisateur</Button>
            </Stack>

            <Paper sx={{ p: mobile ? 1.5 : 2, mb: 3, borderRadius: '12px' }}>
                <TextField fullWidth placeholder="Rechercher un utilisateur..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size={mobile ? "small" : "medium"} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
            </Paper>

            {mobile ? (
                <Stack spacing={2}>
                    {loading ? <Typography textAlign="center">Chargement...</Typography> : filteredUsers.length === 0 ? <Typography textAlign="center">Aucun utilisateur trouvé</Typography> : filteredUsers.map((user) => {
                        const certStatus = getCertificatStatus(user);
                        return (
                            <Card key={user.id} sx={{ borderRadius: '12px' }}>
                                <CardContent>
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{ bgcolor: '#ffc107', width: 40, height: 40 }}>{user.prenom?.[0]}{user.nom?.[0]}</Avatar>
                                            <Box><Typography variant="body2" fontWeight="bold">{user.prenom} {user.nom}</Typography><Typography variant="caption" color="textSecondary">{user.email}</Typography></Box>
                                        </Stack>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Chip label={user.role} size="small" color={getRoleColor(user.role)} />
                                            <Chip label={user.statut || 'ACTIF'} size="small" color={user.statut === 'ACTIF' ? 'success' : 'error'} />
                                            <Tooltip title={certStatus.tooltip}><Chip icon={<Security />} label={certStatus.label} size="small" color={certStatus.color} variant={certStatus.color === 'default' ? 'outlined' : 'filled'} /></Tooltip>
                                        </Stack>
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <Tooltip title={user.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}><IconButton size="small" color="primary" onClick={() => handleToggleStatus(user.id, user.statut)}>{user.statut === 'ACTIF' ? <Block /> : <CheckCircle />}</IconButton></Tooltip>
                                            <Tooltip title="Modifier le rôle"><IconButton size="small" color="secondary" onClick={() => { setSelectedUser(user); setNewRole(user.role); setOpenDialog(true); }}><Edit /></IconButton></Tooltip>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}><TableRow><TableCell><b>Utilisateur</b></TableCell><TableCell><b>Email</b></TableCell><TableCell><b>Rôle</b></TableCell><TableCell><b>Statut</b></TableCell><TableCell><b>Certificat PKI</b></TableCell><TableCell align="center"><b>Actions</b></TableCell></TableRow></TableHead>
                        <TableBody>{loading ? <TableRow><TableCell colSpan={6} align="center">Chargement...</TableCell></TableRow> : filteredUsers.length === 0 ? <TableRow><TableCell colSpan={6} align="center">Aucun utilisateur trouvé</TableCell></TableRow> : filteredUsers.map((user) => { const certStatus = getCertificatStatus(user); return (<TableRow key={user.id} hover><TableCell><Stack direction="row" spacing={1} alignItems="center"><Avatar sx={{ bgcolor: '#ffc107', width: 32, height: 32 }}>{user.prenom?.[0]}{user.nom?.[0]}</Avatar><Box><Typography variant="body2" fontWeight="bold">{user.prenom} {user.nom}</Typography><Typography variant="caption" color="textSecondary">ID: {user.id}</Typography></Box></Stack></TableCell><TableCell>{user.email}</TableCell><TableCell><Chip label={user.role} size="small" color={getRoleColor(user.role)} /></TableCell><TableCell><Chip label={user.statut || 'ACTIF'} size="small" color={user.statut === 'ACTIF' ? 'success' : 'error'} /></TableCell><TableCell><Tooltip title={certStatus.tooltip}><Chip icon={<Security />} label={certStatus.label} size="small" color={certStatus.color} variant={certStatus.color === 'default' ? 'outlined' : 'filled'} /></Tooltip></TableCell><TableCell align="center"><Stack direction="row" spacing={1} justifyContent="center"><Tooltip title={user.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}><IconButton size="small" color="primary" onClick={() => handleToggleStatus(user.id, user.statut)}>{user.statut === 'ACTIF' ? <Block /> : <CheckCircle />}</IconButton></Tooltip><Tooltip title="Modifier le rôle"><IconButton size="small" color="secondary" onClick={() => { setSelectedUser(user); setNewRole(user.role); setOpenDialog(true); }}><Edit /></IconButton></Tooltip><Tooltip title="Rafraîchir"><IconButton size="small" color="info" onClick={fetchUsers}><Refresh /></IconButton></Tooltip></Stack></TableCell></TableRow>); })}</TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>Modifier le rôle</DialogTitle>
                <DialogContent sx={{ mt: 2 }}><Typography variant="body2" gutterBottom>Utilisateur: <strong>{selectedUser?.prenom} {selectedUser?.nom}</strong></Typography><TextField select fullWidth label="Nouveau rôle" value={newRole} onChange={(e) => setNewRole(e.target.value)} sx={{ mt: 2 }}>{roles.map((role) => (<MenuItem key={role} value={role}>{role}</MenuItem>))}</TextField></DialogContent>
                <DialogActions><Button onClick={() => setOpenDialog(false)}>Annuler</Button><Button onClick={handleRoleChange} variant="contained" color="primary">Enregistrer</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default UtilisateursView;