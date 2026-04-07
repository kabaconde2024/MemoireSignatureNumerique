// components/dashboard/Header.jsx
import React, { useState } from 'react';
import { Box, Button, IconButton, Avatar, Tooltip, Badge, Zoom, Fade } from '@mui/material';
import { NotificationsNone, ZoomIn } from '@mui/icons-material';

const Header = ({ setView, userData }) => {
    const [avatarHover, setAvatarHover] = useState(false);

    return (
        <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E2E8F0', p: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            <Button 
                size="small" 
                variant="contained" 
                sx={{ 
                    bgcolor: '#4fc3f7', 
                    color: '#fff',
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                        bgcolor: '#ffc107',
                        color: '#0b1e39',
                        transform: 'translateY(-2px)'
                    }
                }} 
                onClick={() => setView('certificat')}
            >
                Certifier mon compte
            </Button>
            
            <Tooltip title="Notifications">
                <IconButton 
                    sx={{ 
                        transition: 'all 0.3s ease',
                        '&:hover': { 
                            transform: 'rotate(15deg)',
                            bgcolor: 'rgba(0,0,0,0.05)'
                        }
                    }}
                >
                    <Badge badgeContent={3} color="error">
                        <NotificationsNone />
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
                                width: avatarHover ? 44 : 40, 
                                height: avatarHover ? 44 : 40,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: avatarHover ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
                                border: avatarHover ? '2px solid #ffc107' : 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {!userData.photoProfil && (userData.prenom?.[0] || 'U')}
                        </Avatar>
                    </Zoom>
                    
                    {avatarHover && userData.photoProfil && (
                        <Fade in={avatarHover} timeout={200}>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: -25,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    borderRadius: '20px',
                                    px: 1,
                                    py: 0.5,
                                    fontSize: '10px',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10
                                }}
                            >
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