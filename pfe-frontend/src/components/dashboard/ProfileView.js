// components/dashboard/ProfileView.jsx
import React, { useRef, useState } from 'react';
import { 
    Box, Paper, Typography, Button, Stack, Grid, TextField, 
    InputAdornment, Avatar, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, CircularProgress, Snackbar, Alert,
    Tooltip, Fade, Zoom, Grow
} from '@mui/material';
import { Edit, Close, PhotoCamera, Delete, CloudUpload, ZoomIn, ZoomOut } from '@mui/icons-material';
import axios from 'axios';

const ProfileView = ({ userData, setUserData, isEditing, setIsEditing, handleUpdateProfil, setSnackbar }) => {
    const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
    const [openFullscreenDialog, setOpenFullscreenDialog] = useState(false);
    const [tempPhoto, setTempPhoto] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [hovered, setHovered] = useState(false);
    const fileInputRef = useRef(null);

    // ✅ Ouvrir le sélecteur de fichier
    const handlePhotoClick = (e) => {
        e.stopPropagation();
        if (isEditing) {
            fileInputRef.current.click();
        }
    };

    // ✅ Ouvrir la photo en plein écran
    const handleViewFullscreen = () => {
        if (userData.photoProfil) {
            setOpenFullscreenDialog(true);
        }
    };

    // ✅ Gérer la sélection du fichier
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Vérifier la taille (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                setSnackbar({ open: true, message: "L'image est trop volumineuse. Taille maximale: 2MB", severity: 'error' });
                return;
            }
            // Vérifier le type
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

    // ✅ Sauvegarder la photo
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

    // ✅ Supprimer la photo
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
        <Box sx={{ maxWidth: '1200px', mx: 'auto', width: '100%' }}>
            <Grow in={true} timeout={500}>
                <Paper elevation={0} sx={{ p: 5, borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 5 }}>
                        <Typography variant="h5" fontWeight="800">Mes Informations</Typography>
                        {!isEditing ? (
                            <Button startIcon={<Edit />} onClick={() => setIsEditing(true)} variant="outlined" sx={{ color: '#0b1e39', borderColor: '#ffc107' }}>
                                Modifier
                            </Button>
                        ) : (
                            <Button startIcon={<Close />} onClick={() => setIsEditing(false)} color="error" variant="contained">
                                Annuler
                            </Button>
                        )}
                    </Stack>

                    {/* ✅ Photo de profil avec effets améliorés */}
                    <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Tooltip title={userData.photoProfil ? "Cliquez pour agrandir" : (isEditing ? "Cliquez pour ajouter une photo" : "")}>
                                <Box
                                    onMouseEnter={() => setHovered(true)}
                                    onMouseLeave={() => setHovered(false)}
                                    sx={{
                                        position: 'relative',
                                        cursor: userData.photoProfil ? 'pointer' : (isEditing ? 'pointer' : 'default'),
                                        '&:hover .overlay': {
                                            opacity: 1,
                                        },
                                        '&:hover .avatar': {
                                            transform: 'scale(1.05)',
                                            boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                                        }
                                    }}
                                    onClick={userData.photoProfil ? handleViewFullscreen : (isEditing ? handlePhotoClick : undefined)}
                                >
                                    <Avatar 
                                        className="avatar"
                                        src={userData.photoProfil} 
                                        sx={{ 
                                            width: 120, 
                                            height: 120, 
                                            bgcolor: '#ffc107', 
                                            fontSize: '3rem',
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: hovered ? '0 8px 25px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
                                            border: '3px solid white',
                                            outline: hovered ? '2px solid #ffc107' : 'none',
                                        }}
                                    >
                                        {!userData.photoProfil && (userData.prenom?.[0] || 'U')}
                                    </Avatar>
                                    
                                    {/* Overlay avec icône zoom */}
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
                                            <ZoomIn sx={{ fontSize: 40 }} />
                                        </Box>
                                    )}
                                </Box>
                            </Tooltip>
                            
                            {/* Bouton appareil photo animé */}
                            {isEditing && (
                                <Zoom in={isEditing} timeout={300}>
                                    <IconButton 
                                        sx={{ 
                                            position: 'absolute', 
                                            bottom: 0, 
                                            right: 0, 
                                            bgcolor: '#0b1e39', 
                                            color: 'white', 
                                            '&:hover': { 
                                                bgcolor: '#ffc107',
                                                transform: 'rotate(15deg) scale(1.1)',
                                                transition: 'all 0.3s ease'
                                            },
                                            width: 36,
                                            height: 36,
                                            border: '2px solid white',
                                            transition: 'all 0.3s ease'
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
                        
                        <Box>
                            <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '1.2rem' }}>
                                {userData.prenom} {userData.nom}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {userData.email}
                            </Typography>
                            {userData.photoProfil && isEditing && (
                                <Button 
                                    size="small" 
                                    color="error" 
                                    startIcon={<Delete />} 
                                    onClick={handleDeletePhoto}
                                    sx={{ mt: 1, transition: 'all 0.3s ease', '&:hover': { transform: 'scale(1.05)' } }}
                                >
                                    Supprimer la photo
                                </Button>
                            )}
                            {isEditing && !userData.photoProfil && (
                                <Button 
                                    size="small" 
                                    startIcon={<CloudUpload />} 
                                    onClick={handlePhotoClick}
                                    sx={{ mt: 1, transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)' } }}
                                >
                                    Ajouter une photo
                                </Button>
                            )}
                        </Box>
                    </Stack>

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <TextField 
                                fullWidth 
                                label="Prénom" 
                                value={userData.prenom} 
                                onChange={(e) => setUserData({...userData, prenom: e.target.value})} 
                                disabled={!isEditing} 
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField 
                                fullWidth 
                                label="Nom" 
                                value={userData.nom} 
                                onChange={(e) => setUserData({...userData, nom: e.target.value})} 
                                disabled={!isEditing} 
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField 
                                fullWidth 
                                label="Email" 
                                value={userData.email} 
                                disabled 
                                variant="filled" 
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField 
                                fullWidth 
                                label="Téléphone" 
                                value={userData.telephone} 
                                onChange={(e) => setUserData({...userData, telephone: e.target.value})} 
                                disabled={!isEditing} 
                                InputProps={{ startAdornment: <InputAdornment position="start">+216</InputAdornment> }} 
                            />
                        </Grid>
                    </Grid>
                    
                    {isEditing && (
                        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                                variant="contained" 
                                onClick={handleUpdateProfil} 
                                sx={{ 
                                    bgcolor: '#0b1e39', 
                                    px: 8,
                                    transition: 'all 0.3s ease',
                                    '&:hover': { 
                                        bgcolor: '#ffc107',
                                        color: '#0b1e39',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                                    }
                                }}
                            >
                                Enregistrer
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Grow>

            {/* ✅ Dialog d'aperçu de la photo (upload) */}
            <Dialog open={openPhotoDialog} onClose={() => setOpenPhotoDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>
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
                                    objectFit: 'cover',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                                }} 
                            />
                        </Zoom>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPhotoDialog(false)}>Annuler</Button>
                    <Button 
                        onClick={handleSavePhoto} 
                        variant="contained" 
                        disabled={uploading}
                        sx={{ bgcolor: '#1a237e' }}
                    >
                        {uploading ? <CircularProgress size={24} /> : "Enregistrer"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✅ Dialog plein écran pour voir la photo en grand */}
            <Dialog 
                open={openFullscreenDialog} 
                onClose={() => setOpenFullscreenDialog(false)}
                maxWidth="md"
                fullWidth
                TransitionComponent={Fade}
                transitionDuration={500}
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0,0,0,0.95)',
                        borderRadius: '20px',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    bgcolor: 'transparent', 
                    color: 'white', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <Typography variant="h6">Photo de profil</Typography>
                    <IconButton onClick={() => setOpenFullscreenDialog(false)} sx={{ color: 'white' }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ 
                    textAlign: 'center', 
                    py: 4,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px'
                }}>
                    {userData.photoProfil && (
                        <Zoom in={true} timeout={400}>
                            <img 
                                src={userData.photoProfil} 
                                alt="Photo de profil" 
                                style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '60vh', 
                                    borderRadius: '20px',
                                    objectFit: 'contain',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                                    cursor: 'pointer'
                                }} 
                                onClick={() => setOpenFullscreenDialog(false)}
                            />
                        </Zoom>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
                    <Button 
                        onClick={() => setOpenFullscreenDialog(false)}
                        sx={{ color: 'white' }}
                    >
                        Fermer
                    </Button>
                    {isEditing && (
                        <Button 
                            variant="contained" 
                            startIcon={<PhotoCamera />}
                            onClick={() => {
                                setOpenFullscreenDialog(false);
                                handlePhotoClick();
                            }}
                            sx={{ bgcolor: '#ffc107', color: '#0b1e39' }}
                        >
                            Changer la photo
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProfileView;