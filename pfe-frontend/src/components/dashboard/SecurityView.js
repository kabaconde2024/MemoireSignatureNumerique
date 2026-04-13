import React from 'react';
import { Box, Paper, Typography, TextField, Button, Stack, Alert, useMediaQuery } from '@mui/material';
import { Lock, Security } from '@mui/icons-material';

const SecurityView = ({ passwordData, setPasswordData, handleChangePassword, isMobile = false }) => {
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    return (
        <Box sx={{ maxWidth: '800px', mx: 'auto', width: '100%', px: { xs: 1, sm: 2 } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                
                <Stack direction={mobile ? "column" : "row"} alignItems={mobile ? "center" : "flex-start"} spacing={2} mb={3}>
                    <Box sx={{ bgcolor: '#fef3c7', p: 1.5, borderRadius: '16px', display: 'inline-flex' }}>
                        <Security sx={{ color: '#ffc107', fontSize: { xs: 28, sm: 32 } }} />
                    </Box>
                    <Box>
                        <Typography variant={mobile ? "h6" : "h5"} fontWeight="800" sx={{ color: '#1a237e' }}>
                            Sécurité du compte
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Modifiez votre mot de passe régulièrement
                        </Typography>
                    </Box>
                </Stack>

                <Alert severity="info" sx={{ mb: 4, borderRadius: '12px' }}>
                    Pour des raisons de sécurité, votre mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.
                </Alert>

                <Stack spacing={3}>
                    <TextField
                        fullWidth
                        type="password"
                        label="Mot de passe actuel"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                        size={mobile ? "small" : "medium"}
                        InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: '#94a3b8' }} /> }}
                    />
                    <TextField
                        fullWidth
                        type="password"
                        label="Nouveau mot de passe"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        size={mobile ? "small" : "medium"}
                        InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: '#94a3b8' }} /> }}
                    />
                    <TextField
                        fullWidth
                        type="password"
                        label="Confirmer le nouveau mot de passe"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        size={mobile ? "small" : "medium"}
                        InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: '#94a3b8' }} /> }}
                    />
                    
                    <Button 
                        variant="contained" 
                        onClick={handleChangePassword}
                        fullWidth={mobile}
                        sx={{ 
                            bgcolor: '#0b1e39', 
                            py: { xs: 1, sm: 1.5 },
                            mt: 2,
                            '&:hover': { bgcolor: '#1a237e' }
                        }}
                    >
                        Changer le mot de passe
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default SecurityView;