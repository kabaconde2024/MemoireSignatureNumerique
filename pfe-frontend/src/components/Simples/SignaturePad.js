import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Stack, Divider } from '@mui/material';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const SignaturePad = ({ fileUrl, onConfirm, signataireNom, signatureType }) => {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const containerRef = useRef(null);
    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        setPosition({ 
            x: Math.min(Math.max(x, 5), 95), 
            y: Math.min(Math.max(y, 5), 95) 
        });
    };

    const handleConfirmClick = () => {
        onConfirm({
            x: position.x,
            y: position.y,
            page: 1
        });
    };

    return (
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f0f2f5', borderRadius: '15px' }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#0b1e39', fontWeight: 'bold' }}>
                Positionnez le cachet de signature pour : {signataireNom}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 2, color: signatureType === 'pki' ? '#2e7d32' : '#ffc107', fontWeight: 'bold' }}>
                Type de signature : {signatureType === 'pki' ? '🔐 Signature PKI (avec certificat numérique)' : '📝 Signature simple'}
            </Typography>
            
            <Box 
                ref={containerRef}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                sx={{ 
                    position: 'relative', 
                    border: '2px solid #bdc3c7', 
                    height: '75vh', 
                    overflowY: 'auto',
                    bgcolor: '#525659',
                    boxShadow: '0px 10px 30px rgba(0,0,0,0.2)',
                    borderRadius: '8px'
                }}
            >
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                    <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
                </Worker>

                <Box
                    draggable
                    sx={{
                        position: 'absolute',
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        width: '180px',
                        height: '90px',
                        bgcolor: signatureType === 'pki' ? 'rgba(46, 125, 50, 0.8)' : 'rgba(255, 193, 7, 0.8)',
                        border: signatureType === 'pki' ? '2px dashed #2e7d32' : '2px dashed #0b1e39',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'move',
                        zIndex: 1000,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0px 4px 15px rgba(0,0,0,0.4)',
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: signatureType === 'pki' ? '#fff' : '#0b1e39', textTransform: 'uppercase' }}>
                        {signatureType === 'pki' ? '🔐 SIGNATURE PKI' : 'Zone de Signature'}
                    </Typography>
                    <Divider sx={{ width: '80%', my: 0.5, borderColor: signatureType === 'pki' ? '#fff' : '#0b1e39' }} />
                    <Typography variant="body2" sx={{ fontSize: '11px', color: signatureType === 'pki' ? '#fff' : '#0b1e39', fontWeight: 'bold' }}>
                        {signataireNom}
                    </Typography>
                </Box>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                <Button 
                    variant="contained" 
                    size="large"
                    onClick={handleConfirmClick}
                    sx={{ 
                        bgcolor: signatureType === 'pki' ? '#2e7d32' : '#0b1e39', 
                        px: 6, 
                        py: 1.5, 
                        '&:hover': { bgcolor: signatureType === 'pki' ? '#1b5e20' : '#1a3a5a' } 
                    }}
                >
                    Valider la position et envoyer l'invitation
                </Button>
            </Stack>
            
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#7f8c8d' }}>
                Glissez-déposez le rectangle {signatureType === 'pki' ? 'vert' : 'jaune'} à l'endroit souhaité sur le document.
            </Typography>
        </Box>
    );
};

export default SignaturePad;