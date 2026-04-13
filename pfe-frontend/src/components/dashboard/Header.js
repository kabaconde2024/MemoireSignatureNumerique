import React, { useState } from 'react';
import { Box, Button, IconButton, Avatar, Tooltip, Badge, Zoom, Fade, useMediaQuery } from '@mui/material';
import { NotificationsNone, ZoomIn } from '@mui/icons-material';

const Header = ({ setView, userData, isMobile = false, isTablet = false }) => {
    const [avatarHover, setAvatarHover] = useState(false);
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    return (
        <Box sx={{ 
            bgcolor: '#fff', 
            borderBottom: '1px solid #E2E8F0', 
            p: { xs: 1, sm: 2 }, 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 },
            flexWrap: 'wrap'
        }}>
            <Button 
                size={mobile ? "small" : "medium"} 
                variant="contained" 
                sx={{ 
                    bgcolor: '#4fc3f7', 
                    color: '#fff',
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    px: { xs: 1.5, sm: 2 },
                    '&:hover': { bgcolor: '#ffc107', color: '#0b1e39' }
                }} 
                onClick={() => setView('certificat')}
            >
                {mobile ? "Certifier" : "Certifier mon compte"}
            </Button>
            
            <Tooltip title="Notifications">
                <IconButton size={mobile ? "small" : "medium"}>
                    <Badge badgeContent={3} color="error">
                        <NotificationsNone fontSize={mobile ? "small" : "medium"} />
                    </Badge>
                </IconButton>
            </Tooltip>
            
            <Tooltip title={`${userData.prenom} ${userData.nom}`}>
                <Box
                    onMouseEnter={() => setAvatarHover(true)}
                    onMouseLeave={() => setAvatarHover(false)}
                    sx={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setView('mes-informations')}
                >
                    <Zoom in={true} timeout={300}>
                        <Avatar 
                            src={userData.photoProfil} 
                            sx={{ 
                                bgcolor: '#ffc107', 
                                color: '#0b1e39', 
                                width: { xs: avatarHover ? 36 : 32, sm: avatarHover ? 44 : 40 }, 
                                height: { xs: avatarHover ? 36 : 32, sm: avatarHover ? 44 : 40 },
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: avatarHover ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {!userData.photoProfil && (userData.prenom?.[0] || 'U')}
                        </Avatar>
                    </Zoom>
                    
                    {avatarHover && userData.photoProfil && !mobile && (
                        <Fade in={avatarHover} timeout={200}>
                            <Box sx={{ position: 'absolute', bottom: -25, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: '20px', px: 1, py: 0.5, fontSize: '10px', whiteSpace: 'nowrap', zIndex: 10 }}>
                                Voir profil
                            </Box>
                        </Fade>
                    )}
                </Box>
            </Tooltip>
        </Box>
    );
};

export default Header;