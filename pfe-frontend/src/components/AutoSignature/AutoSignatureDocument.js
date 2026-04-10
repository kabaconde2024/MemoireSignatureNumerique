import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Button, Typography, Paper, CircularProgress, Stack, Zoom, Alert } from '@mui/material';
import { CloudUpload, Download, HistoryEdu, CheckCircleOutline, PictureAsPdf, Warning } from '@mui/icons-material';
import axios from 'axios';

// Configuration du worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const AutoSignatureDocument = ({ setSnackbar }) => {
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(false);
    const [signedFileUrl, setSignedFileUrl] = useState(null);
    const [coords, setCoords] = useState({ x: 100, y: 100, page: 1, displayPageHeight: 0 });
    const [hasSignature, setHasSignature] = useState(null);
    const [checkingSignature, setCheckingSignature] = useState(true);
    const contentRef = useRef(null);

    const API_BASE_URL = 'https://memoiresignaturenumerique.onrender.com/api';

    // ✅ Récupération du profil au chargement (Correction 403)
    useEffect(() => {
        const checkUserSignature = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setHasSignature(false);
                    return;
                }

                const response = await axios.get(`${API_BASE_URL}/utilisateur/mon-profil`, { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    withCredentials: true 
                });
                
                const userData = response.data;
                // Vérifie si l'image de signature existe
                setHasSignature(!!(userData.imageSignature && userData.imageSignature !== ''));
            } catch (error) {
                console.error("Erreur vérification signature:", error);
                setHasSignature(false);
            } finally {
                setCheckingSignature(false);
            }
        };
        checkUserSignature();
    }, []);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleCaptureCoords = (e) => {
        if (signedFileUrl || loading) return;

        const rect = contentRef.current.getBoundingClientRect();
        const pageElements = contentRef.current.querySelectorAll('.react-pdf__Page');
        
        let currentPage = 1;
        let localY = e.clientY - rect.top;
        let pHeight = 0;

        for (let i = 0; i < pageElements.length; i++) {
            const pRect = pageElements[i].getBoundingClientRect();
            if (e.clientY >= pRect.top && e.clientY <= pRect.bottom) {
                currentPage = i + 1;
                localY = e.clientY - pRect.top;
                pHeight = pRect.height;
                break;
            }
        }

        setCoords({
            x: e.clientX - rect.left,
            y: localY,
            page: currentPage,
            displayPageHeight: pHeight
        });
    };

    // ✅ Processus de signature complet avec Headers (Correction 403)
    const handleAutoSign = async () => {
        if (!file) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            setSnackbar({ open: true, message: "❌ Session expirée, veuillez vous reconnecter.", severity: 'error' });
            return;
        }

        setLoading(true);
        try {
            // 1. Upload du document
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data' 
                },
                withCredentials: true 
            });

            // 2. Application de la signature
            const response = await axios.post(`${API_BASE_URL}/signature/appliquer-auto-signature`, null, {
                params: {
                    documentId: uploadRes.data.id,
                    x: coords.x,
                    y: coords.y,
                    pageNumber: coords.page,
                    displayWidth: 800, 
                    displayHeight: coords.displayPageHeight
                },
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob',
                withCredentials: true
            });

            const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            setSignedFileUrl(url);
            setSnackbar({ open: true, message: "✅ Document signé avec succès !", severity: 'success' });
        } catch (err) {
            console.error("Erreur signature:", err);
            const errorMsg = err.response?.data?.erreur || "Erreur lors de la signature";
            setSnackbar({ open: true, message: `❌ ${errorMsg}`, severity: 'error' });
        } finally { 
            setLoading(false); 
        }
    };

    // --- RENDU : État de chargement ---
    if (checkingSignature) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    // --- RENDU : Pas de signature enregistrée ---
    if (!hasSignature) {
        return (
            <Box sx={{ maxWidth: '1000px', mx: 'auto', p: 3 }}>
                <Paper elevation={0} sx={{ p: 4, borderRadius: '24px', textAlign: 'center', border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                    <Warning sx={{ fontSize: 80, color: '#ff9800', mb: 2 }} />
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#e65100' }}>
                        Signature manuscrite requise
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                        Vous devez d'abord créer votre signature manuscrite dans votre profil avant de pouvoir utiliser l'auto-signature.
                    </Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => window.location.href = '/user-dashboard?tab=ma-signature'}
                        sx={{ bgcolor: '#1a237e', px: 4, py: 1.5, borderRadius: '10px' }}
                    >
                        Créer ma signature maintenant
                    </Button>
                </Paper>
            </Box>
        );
    }

    // --- RENDU PRINCIPAL ---
    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto', p: 3 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: '24px', textAlign: 'center', border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e', mb: 1 }}>
                        Auto-Signature
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Placez votre signature enregistrée en cliquant sur le document
                    </Typography>
                    <Alert severity="success" sx={{ mt: 2, borderRadius: '12px' }}>
                        ✅ Prêt à signer avec votre signature enregistrée
                    </Alert>
                </Box>

                {!file && (
                    <Box 
                        component="label"
                        sx={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            height: '250px', border: '2px dashed #1976d2', borderRadius: '20px',
                            bgcolor: '#f0f7ff', cursor: 'pointer', transition: '0.3s',
                            '&:hover': { bgcolor: '#e3f2fd', borderColor: '#0d47a1' }
                        }}
                    >
                        <CloudUpload sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600 }}>
                            Cliquez pour charger le PDF
                        </Typography>
                        <input type="file" hidden accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
                    </Box>
                )}

                {file && (
                    <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2, px: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <PictureAsPdf color="error" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{file.name}</Typography>
                            </Stack>
                            {!signedFileUrl && (
                                <Button size="small" onClick={() => {setFile(null); setSignedFileUrl(null);}} color="error">
                                    Changer de fichier
                                </Button>
                            )}
                        </Stack>

                        <Box sx={{ 
                            height: '65vh', overflowY: 'auto', border: '1px solid #d1d1d1', 
                            bgcolor: '#525659', borderRadius: '12px'
                        }}>
                            <Box ref={contentRef} onClick={handleCaptureCoords} sx={{ position: 'relative', cursor: 'crosshair', display: 'inline-block', py: 2 }}>
                                <Document file={signedFileUrl || file} onLoadSuccess={onDocumentLoadSuccess}>
                                    {Array.from(new Array(numPages), (el, index) => (
                                        <Page 
                                            key={`p_${index + 1}`} 
                                            pageNumber={index + 1} 
                                            width={800} 
                                            className="pdf-page-shadow"
                                            renderTextLayer={false} 
                                            renderAnnotationLayer={false} 
                                            sx={{ mb: 2 }}
                                        />
                                    ))}
                                </Document>

                                {!signedFileUrl && (
                                    <Box sx={{
                                        position: 'absolute', 
                                        left: coords.x - 70, 
                                        top: (coords.page - 1) * (coords.displayPageHeight + 16) + coords.y - 25,
                                        width: '140px', height: '50px', border: '2px solid #1976d2',
                                        borderRadius: '4px', bgcolor: 'rgba(25, 118, 210, 0.2)', 
                                        pointerEvents: 'none', zIndex: 10, display: 'flex', 
                                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Typography variant="caption" sx={{ color: '#0d47a1', fontWeight: 800, fontSize: '0.6rem' }}>
                                            POSITION SIGNATURE
                                        </Typography>
                                        <HistoryEdu sx={{ fontSize: 18, color: '#0d47a1' }} />
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Box sx={{ mt: 4 }}>
                            {!signedFileUrl ? (
                                <Zoom in={!!file}>
                                    <Button 
                                        variant="contained" 
                                        onClick={handleAutoSign} 
                                        disabled={loading}
                                        sx={{ borderRadius: '50px', px: 6, py: 1.5, fontSize: '1.1rem' }}
                                        startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <HistoryEdu />}
                                    >
                                        {loading ? "Signature en cours..." : "Appliquer ma signature"}
                                    </Button>
                                </Zoom>
                            ) : (
                                <Stack direction="column" spacing={2} alignItems="center">
                                    <Typography sx={{ color: 'success.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleOutline /> Signature appliquée !
                                    </Typography>
                                    <Button 
                                        variant="contained" color="success" 
                                        href={signedFileUrl} 
                                        download={`Signe_${file.name}`}
                                        sx={{ borderRadius: '50px', px: 6, py: 1.5 }}
                                        startIcon={<Download />}
                                    >
                                        Télécharger le PDF signé
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                    </Box>
                )}
            </Paper>

            <style>
                {`
                    .pdf-page-shadow canvas {
                        box-shadow: 0px 10px 30px rgba(0,0,0,0.3) !important;
                        border-radius: 4px;
                        margin-bottom: 10px;
                    }
                `}
            </style>
        </Box>
    );
};

export default AutoSignatureDocument;