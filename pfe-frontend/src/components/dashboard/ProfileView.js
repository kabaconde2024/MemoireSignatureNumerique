import React, { useRef, useState } from 'react';
import { 
    Box, Paper, Typography, Button, Stack, Grid, TextField, 
    InputAdornment, Avatar, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, CircularProgress, Tooltip,
    Fade, Zoom, Grow, useMediaQuery
} from '@mui/material';
import { Edit, Close, PhotoCamera, Delete, CloudUpload, ZoomIn } from '@mui/icons-material';
import axios from 'axios';

const ProfileView = ({ userData, setUserData, isEditing, setIsEditing, handleUpdateProfil, setSnackbar, isMobile = false }) => {
    const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
    const [openFullscreenDialog, setOpenFullscreenDialog] = useState(false);
    const [tempPhoto, setTempPhoto] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [hovered, setHovered] = useState(false);
    const fileInputRef = useRef(null);
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    const handlePhotoClick = (e) => {
        e.stopPropagation();
        if (isEditing) {
            fileInputRef.current.click();
        }
    };

    const handleViewFullscreen = () => {
        if (userData.photoProfil) {
            setOpenFullscreenDialog(true);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setSnackbar({ open: true, message: "L'image est trop volumineuse. Taille maximale: 2MB", severity: 'error' });
                return;
            }
            if (!file.type.startsWith('image/')) {
                setSnackbar({ open: true, message: "Veuillez sélectionner une image (JPEG, PNG, GIF)", severity: 'error' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempPhoto(reader.result);
                setOpenPhotoDialog(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSavePhoto = async () => {
        setUploading(true);
        try {
            await axios.post('https://memoiresignaturenumerique.onrender.com/api/utilisateur/upload-photo', 
                { photo: tempPhoto },
                { withCredentials: true }
            );
            setUserData({ ...userData, photoProfil: tempPhoto });
            setOpenPhotoDialog(false);
            setSnackbar({ open: true, message: "✅ Photo de profil mise à jour", severity: 'success' });
        } catch (error) {
            console.error("Erreur upload photo:", error);
            setSnackbar({ open: true, message: "❌ Erreur lors de l'upload de la photo", severity: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async () => {
        setUploading(true);
        try {
            await axios.post('https://memoiresignaturenumerique.onrender.com/api/utilisateur/upload-photo', 
                { photo: null },
                { withCredentials: true }
            );
            setUserData({ ...userData, photoProfil: null });
            setTempPhoto(null);
            setSnackbar({ open: true, message: "✅ Photo de profil supprimée", severity: 'success' });
        } catch (error) {
            console.error("Erreur suppression photo:", error);
            setSnackbar({ open: true, message: "❌ Erreur lors de la suppression", severity: 'error' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto', width: '100%', px: { xs: 1, sm: 2 } }}>
            <Grow in={true} timeout={500}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 5 }, borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: { xs: 3, sm: 5 }, flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant={mobile ? "h6" : "h5"} fontWeight="800">Mes Informations</Typography>
                        {!isEditing ? (
                            <Button startIcon={<Edit />} onClick={() => setIsEditing(true)} variant="outlined" sx={{ color: '#0b1e39', borderColor: '#ffc107' }} size={mobile ? "small" : "medium"}>
                                Modifier
                            </Button>
                        ) : (
                            <Button startIcon={<Close />} onClick={() => setIsEditing(false)} color="error" variant="contained" size={mobile ? "small" : "medium"}>
                                Annuler
                            </Button>
                        )}
                    </Stack>

                    <Stack direction={mobile ? "column" : "row"} spacing={3} alignItems="center" sx={{ mb: 4 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Tooltip title={userData.photoProfil ? "Cliquez pour agrandir" : (isEditing ? "Cliquez pour ajouter une photo" : "")}>
                                <Box
                                    onMouseEnter={() => setHovered(true)}
                                    onMouseLeave={() => setHovered(false)}
                                    sx={{
                                        position: 'relative',
                                        cursor: userData.photoProfil ? 'pointer' : (isEditing ? 'pointer' : 'default'),
                                        '&:hover .overlay': { opacity: 1 },
                                        '&:hover .avatar': { transform: 'scale(1.05)', boxShadow: '0 8px 25px rgba(0,0,0,0.2)' }
                                    }}
                                    onClick={userData.photoProfil ? handleViewFullscreen : (isEditing ? handlePhotoClick : undefined)}
                                >
                                    <Avatar 
                                        className="avatar"
                                        src={userData.photoProfil} 
                                        sx={{ 
                                            width: { xs: 90, sm: 120 }, 
                                            height: { xs: 90, sm: 120 }, 
                                            bgcolor: '#ffc107', 
                                            fontSize: { xs: '2rem', sm: '3rem' },
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: hovered ? '0 8px 25px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
                                            border: '3px solid white',
                                            outline: hovered ? '2px solid #ffc107' : 'none',
                                        }}
                                    >
                                        {!userData.photoProfil && (userData.prenom?.[0] || 'U')}
                                    </Avatar>
                                    
                                    {userData.photoProfil && (
                                        <Box 
                                            className="overlay"
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                borderRadius: '50%',
                                                bgcolor: 'rgba(0,0,0,0.5)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0,
                                                transition: 'opacity 0.3s ease',
                                                color: 'white',
                                            }}
                                        >
                                            <ZoomIn sx={{ fontSize: { xs: 30, sm: 40 } }} />
                                        </Box>
                                    )}
                                </Box>
                            </Tooltip>
                            
                            {isEditing && (
                                <Zoom in={isEditing} timeout={300}>
                                    <IconButton 
                                        sx={{ 
                                            position: 'absolute', 
                                            bottom: 0, 
                                            right: 0, 
                                            bgcolor: '#0b1e39', 
                                            color: 'white', 
                                            '&:hover': { bgcolor: '#ffc107', transform: 'rotate(15deg) scale(1.1)' },
                                            width: { xs: 30, sm: 36 },
                                            height: { xs: 30, sm: 36 },
                                            border: '2px solid white'
                                        }}
                                        size="small"
                                        onClick={handlePhotoClick}
                                    >
                                        <PhotoCamera fontSize="small" />
                                    </IconButton>
                                </Zoom>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/jpeg,image/png,image/jpg,image/gif"
                                onChange={handleFileChange}
                            />
                        </Box>
                        
                        <Box sx={{ textAlign: mobile ? 'center' : 'left' }}>
                            <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                                {userData.prenom} {userData.nom}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {userData.email}
                            </Typography>
                            {userData.photoProfil && isEditing && (
                                <Button size="small" color="error" startIcon={<Delete />} onClick={handleDeletePhoto} sx={{ mt: 1 }}>
                                    Supprimer la photo
                                </Button>
                            )}
                            {isEditing && !userData.photoProfil && (
                                <Button size="small" startIcon={<CloudUpload />} onClick={handlePhotoClick} sx={{ mt: 1 }}>
                                    Ajouter une photo
                                </Button>
                            )}
                        </Box>
                    </Stack>

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                fullWidth 
                                label="Prénom" 
                                value={userData.prenom} 
                                onChange={(e) => setUserData({...userData, prenom: e.target.value})} 
                                disabled={!isEditing}
                                size={mobile ? "small" : "medium"}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                fullWidth 
                                label="Nom" 
                                value={userData.nom} 
                                onChange={(e) => setUserData({...userData, nom: e.target.value})} 
                                disabled={!isEditing}
                                size={mobile ? "small" : "medium"}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                fullWidth 
                                label="Email" 
                                value={userData.email} 
                                disabled 
                                variant="filled"
                                size={mobile ? "small" : "medium"}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                fullWidth 
                                label="Téléphone" 
                                value={userData.telephone} 
                                onChange={(e) => setUserData({...userData, telephone: e.target.value})} 
                                disabled={!isEditing} 
                                InputProps={{ startAdornment: <InputAdornment position="start">+216</InputAdornment> }}
                                size={mobile ? "small" : "medium"}
                            />
                        </Grid>
                    </Grid>
                    
                    {isEditing && (
                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                                variant="contained" 
                                onClick={handleUpdateProfil} 
                                sx={{ 
                                    bgcolor: '#0b1e39', 
                                    px: { xs: 4, sm: 8 },
                                    py: { xs: 1, sm: 1.5 },
                                    width: mobile ? '100%' : 'auto'
                                }}
                            >
                                Enregistrer
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Grow>

            <Dialog open={openPhotoDialog} onClose={() => setOpenPhotoDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    Aperçu de la photo
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', py: 3 }}>
                    {tempPhoto && (
                        <Zoom in={true}>
                            <img 
                                src={tempPhoto} 
                                alt="Aperçu" 
                                style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '300px', 
                                    borderRadius: '12px',
                                    objectFit: 'cover'
                                }} 
                            />
                        </Zoom>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPhotoDialog(false)}>Annuler</Button>
                    <Button onClick={handleSavePhoto} variant="contained" disabled={uploading} sx={{ bgcolor: '#1a237e' }}>
                        {uploading ? <CircularProgress size={24} /> : "Enregistrer"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog 
                open={openFullscreenDialog} 
                onClose={() => setOpenFullscreenDialog(false)}
                maxWidth="md"
                fullWidth
                TransitionComponent={Fade}
                PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)', borderRadius: '20px', margin: { xs: 2, sm: 'auto' } } }}
            >
                <DialogTitle sx={{ bgcolor: 'transparent', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant={mobile ? "subtitle1" : "h6"}>Photo de profil</Typography>
                    <IconButton onClick={() => setOpenFullscreenDialog(false)} sx={{ color: 'white' }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', py: 4, minHeight: { xs: '300px', sm: '400px' } }}>
                    {userData.photoProfil && (
                        <Zoom in={true}>
                            <img 
                                src={userData.photoProfil} 
                                alt="Photo de profil" 
                                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '20px', objectFit: 'contain' }} 
                                onClick={() => setOpenFullscreenDialog(false)}
                            />
                        </Zoom>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
                    <Button onClick={() => setOpenFullscreenDialog(false)} sx={{ color: 'white' }}>Fermer</Button>
                    {isEditing && (
                        <Button variant="contained" startIcon={<PhotoCamera />} onClick={() => { setOpenFullscreenDialog(false); handlePhotoClick(); }} sx={{ bgcolor: '#ffc107', color: '#0b1e39' }}>
                            Changer la photo
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProfileView;