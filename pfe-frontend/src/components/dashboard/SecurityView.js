import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Stack, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const SecurityView = ({ passwordData, setPasswordData, handleChangePassword }) => {
    const [showPasswords, setShowPasswords] = useState(false);

    return (
        <Box sx={{ maxWidth: '800px', mx: 'auto', width: '100%' }}>
            <Paper elevation={0} sx={{ p: 5, borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                <Typography variant="h5" fontWeight="800" sx={{ mb: 4 }}>Changer le Mot de passe</Typography>
                <Stack spacing={3}>
                    <TextField fullWidth label="Ancien mot de passe" type={showPasswords ? "text" : "password"} value={passwordData.oldPassword} onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})} />
                    <TextField fullWidth label="Nouveau mot de passe" type={showPasswords ? "text" : "password"} value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} />
                    <TextField fullWidth label="Confirmer le nouveau mot de passe" type={showPasswords ? "text" : "password"} value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPasswords(!showPasswords)}>{showPasswords ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} />
                    <Button variant="contained" onClick={handleChangePassword} sx={{ bgcolor: '#0b1e39', py: 1.5, fontWeight: 'bold' }}>Mettre à jour le mot de passe</Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default SecurityView;