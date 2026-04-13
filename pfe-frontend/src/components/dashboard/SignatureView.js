import React, { useRef, useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, Alert, useMediaQuery } from '@mui/material';
import { Draw as DrawIcon, CheckCircle } from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';

const SignatureView = ({ setSnackbar, onSignatureSaved, isMobile = false }) => {
    const sigPad = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [signatureExists, setSignatureExists] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    useEffect(() => {
        const checkExistingSignature = async () => {
            try {
                const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/utilisateur/mon-profil', { withCredentials: true });
                if (response.data.imageSignature) {
                    setSignatureExists(true);
                    setPreviewUrl(response.data.imageSignature);
                }
            } catch (error) {
                console.error("Erreur vérification signature:", error);
            }
        };
        checkExistingSignature();
    }, []);

    const clear = () => {
        if (sigPad.current) {
            sigPad.current.clear();
            setIsSaved(false);
        }
    };

    const saveSignature = async () => {
        if (sigPad.current.isEmpty()) {
            setSnackbar({ open: true, message: "Veuillez dessiner une signature.", severity: 'warning' });
            return;
        }
        
        const canvas = sigPad.current.getCanvas();
        const dataURL = canvas.toDataURL('image/png');
        
        try {
            setIsSaving(true);
            await axios.post('https://memoiresignaturenumerique.onrender.com/api/utilisateur/sauvegarder-signature', 
                { imageSignature: dataURL }, 
                { withCredentials: true }
            );
            setSignatureExists(true);
            setPreviewUrl(dataURL);
            setIsSaved(true);
            setSnackbar({ open: true, message: "✅ Signature manuscrite enregistrée !", severity: 'success' });
            clear();
            if (onSignatureSaved) onSignatureSaved();
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error("Erreur save signature:", error);
            setSnackbar({ open: true, message: "❌ Erreur lors de l'enregistrement.", severity: 'error' });
        } finally { setIsSaving(false); }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%', px: { xs: 1, sm: 2 } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 5 }, borderRadius: '20px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                
                {isSaved && (
                    <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setIsSaved(false)}>
                        Signature enregistrée avec succès !
                    </Alert>
                )}
                
                {signatureExists && previewUrl && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: '12px' }}>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                            Signature actuellement enregistrée :
                        </Typography>
                        <img src={previewUrl} alt="Signature actuelle" style={{ maxHeight: '80px', maxWidth: '300px', border: '1px solid #ddd', borderRadius: '4px', padding: '8px', backgroundColor: '#fff' }} />
                    </Box>
                )}
                
                <Typography variant={mobile ? "h6" : "h5"} fontWeight="800" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <DrawIcon /> {signatureExists ? "Modifier ma signature manuscrite" : "Ma signature manuscrite"}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" sx={{ mb: 4, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {signatureExists ? "Vous pouvez modifier votre signature en dessinant une nouvelle ci-dessous." : "Cette signature sera utilisée par défaut pour vos signatures électroniques."}
                </Typography>
                
                <Box sx={{ border: '1px solid #ccc', borderRadius: '8px', bgcolor: '#fff', mb: 3, cursor: 'crosshair', overflow: 'auto', maxWidth: '100%', mx: 'auto' }}>
                    <SignatureCanvas 
                        ref={sigPad}
                        penColor='black'
                        canvasProps={{ width: mobile ? 350 : 600, height: mobile ? 150 : 200, className: 'sigCanvas', style: { maxWidth: '100%', height: 'auto' } }}
                    />
                </Box>
                
                <Stack direction={mobile ? "column" : "row"} spacing={2} justifyContent="center">
                    <Button variant="outlined" onClick={clear} disabled={isSaving} fullWidth={mobile} sx={{ px: 4 }}>
                        Effacer
                    </Button>
                    <Button variant="contained" onClick={saveSignature} disabled={isSaving} fullWidth={mobile} sx={{ bgcolor: '#0b1e39', px: 4, fontWeight: 'bold' }}>
                        {isSaving ? "Enregistrement..." : (signatureExists ? "Mettre à jour" : "Enregistrer")}
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default SignatureView;