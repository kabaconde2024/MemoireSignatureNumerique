import React, { useRef, useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, Alert } from '@mui/material';
import { Draw as DrawIcon, CheckCircle } from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';

const SignatureView = ({ setSnackbar, onSignatureSaved }) => {
    const sigPad = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [signatureExists, setSignatureExists] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Vérifier si une signature existe déjà au chargement
    useEffect(() => {
        const checkExistingSignature = async () => {
            try {
                const response = await axios.get('https://localhost:8443/api/utilisateur/mon-profil', { withCredentials: true });
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
            await axios.post('https://localhost:8443/api/utilisateur/sauvegarder-signature', 
                { imageSignature: dataURL }, 
                { withCredentials: true }
            );
            
            // ✅ Mettre à jour l'état local
            setSignatureExists(true);
            setPreviewUrl(dataURL);
            setIsSaved(true);
            
            setSnackbar({ open: true, message: "✅ Signature manuscrite enregistrée !", severity: 'success' });
            
            // ✅ Vider le canvas après l'enregistrement
            clear();
            
            // ✅ Notifier le parent si nécessaire
            if (onSignatureSaved) {
                onSignatureSaved();
            }
            
            // ✅ Faire disparaître le message de succès après 3 secondes
            setTimeout(() => {
                setIsSaved(false);
            }, 3000);
            
        } catch (error) {
            console.error("Erreur save signature:", error);
            setSnackbar({ open: true, message: "❌ Erreur lors de l'enregistrement.", severity: 'error' });
        } finally { 
            setIsSaving(false); 
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%' }}>
            <Paper elevation={0} sx={{ p: 5, borderRadius: '20px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                
                {/* Message de succès temporaire */}
                {isSaved && (
                    <Alert 
                        icon={<CheckCircle />} 
                        severity="success" 
                        sx={{ mb: 3, borderRadius: '12px' }}
                        onClose={() => setIsSaved(false)}
                    >
                        Signature enregistrée avec succès !
                    </Alert>
                )}
                
                {/* Aperçu de la signature existante */}
                {signatureExists && previewUrl && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: '12px' }}>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                            Signature actuellement enregistrée :
                        </Typography>
                        <img 
                            src={previewUrl} 
                            alt="Signature actuelle" 
                            style={{ 
                                maxHeight: '80px', 
                                maxWidth: '300px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '8px',
                                backgroundColor: '#fff'
                            }} 
                        />
                    </Box>
                )}
                
                <Typography variant="h5" fontWeight="800" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <DrawIcon /> 
                    {signatureExists ? "Modifier ma signature manuscrite" : "Ma signature manuscrite"}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
                    {signatureExists 
                        ? "Vous pouvez modifier votre signature en dessinant une nouvelle ci-dessous."
                        : "Cette signature sera utilisée par défaut pour vos signatures électroniques."}
                </Typography>
                
                <Box sx={{ 
                    border: '1px solid #ccc', 
                    borderRadius: '8px', 
                    bgcolor: '#fff', 
                    mb: 3, 
                    cursor: 'crosshair', 
                    overflow: 'hidden', 
                    maxWidth: '602px', 
                    mx: 'auto' 
                }}>
                    <SignatureCanvas 
                        ref={sigPad}
                        penColor='black'
                        canvasProps={{ width: 600, height: 200, className: 'sigCanvas' }}
                    />
                </Box>
                
                <Stack direction="row" spacing={2} justifyContent="center">
                    <Button 
                        variant="outlined" 
                        onClick={clear} 
                        disabled={isSaving} 
                        sx={{ px: 4 }}
                    >
                        Effacer
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={saveSignature} 
                        disabled={isSaving} 
                        sx={{ bgcolor: '#0b1e39', px: 4, fontWeight: 'bold' }}
                    >
                        {isSaving ? "Enregistrement..." : (signatureExists ? "Mettre à jour" : "Enregistrer")}
                    </Button>
                </Stack>
                
                {signatureExists && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
                        💡 La nouvelle signature remplacera l'ancienne automatiquement
                    </Typography>
                )}
            </Paper>
        </Box>
    );
};

export default SignatureView;