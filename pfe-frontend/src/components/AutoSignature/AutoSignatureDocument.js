import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Button, Typography, Paper, CircularProgress, Stack, Zoom, Alert, useMediaQuery } from '@mui/material';
import { CloudUpload, Download, HistoryEdu, CheckCircleOutline, PictureAsPdf, Warning } from '@mui/icons-material';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// URL de l'API backend
const API_BASE_URL = 'https://trustsign-backend-3zsj.onrender.com';

// Fonction pour les requêtes API avec cookie
const fetchAPI = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
};

const AutoSignatureDocument = ({ setSnackbar, isMobile = false }) => {
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(false);
    const [signedFileUrl, setSignedFileUrl] = useState(null);
    const [coords, setCoords] = useState({ x: 100, y: 100, page: 1, displayPageHeight: 0 });
    const [hasSignature, setHasSignature] = useState(null);
    const [checkingSignature, setCheckingSignature] = useState(true);
    const contentRef = useRef(null);
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    const checkUserSignature = async () => {
        try {
            const data = await fetchAPI('/utilisateur/mon-profil');
            if (data.imageSignature && data.imageSignature !== '') {
                setHasSignature(true);
            } else {
                setHasSignature(false);
            }
        } catch (error) {
            console.error("❌ Erreur vérification signature:", error);
            setHasSignature(false);
        } finally {
            setCheckingSignature(false);
        }
    };

    useEffect(() => {
        checkUserSignature();
    }, []);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        console.log(`📄 Document chargé: ${numPages} pages`);
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

        const newCoords = {
            x: e.clientX - rect.left,
            y: localY,
            page: currentPage,
            displayPageHeight: pHeight
        };
        
        setCoords(newCoords);
        console.log("📍 Position de signature enregistrée:", newCoords);
    };

    const handleAutoSign = async () => {
        if (!file) return;
        
        if (!hasSignature) {
            setSnackbar({ open: true, message: "❌ Vous n'avez pas de signature enregistrée.", severity: 'error' });
            return;
        }
        
        setLoading(true);
        
        try {
            // Upload du fichier avec FormData
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadResponse = await fetch(`${API_BASE_URL}/api/documents/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }
            
            const uploadData = await uploadResponse.json();
            
            // Application de la signature
            const signResponse = await fetch(`${API_BASE_URL}/api/signature/appliquer-auto-signature?documentId=${uploadData.id}&x=${coords.x}&y=${coords.y}&pageNumber=${coords.page}&displayWidth=${mobile ? 400 : 800}&displayHeight=${coords.displayPageHeight}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/pdf'
                }
            });
            
            if (!signResponse.ok) {
                const errorData = await signResponse.json();
                throw new Error(errorData.erreur || 'Erreur lors de la signature');
            }
            
            const blob = await signResponse.blob();
            const url = URL.createObjectURL(blob);
            setSignedFileUrl(url);
            setSnackbar({ open: true, message: "✅ Document signé avec succès !", severity: 'success' });
        } catch (err) {
            console.error("Erreur:", err);
            setSnackbar({ open: true, message: `❌ ${err.message}`, severity: 'error' });
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        return () => { if (signedFileUrl) URL.revokeObjectURL(signedFileUrl); };
    }, [signedFileUrl]);

    if (!checkingSignature && !hasSignature) {
        return (
            <Box sx={{ maxWidth: '1000px', mx: 'auto', p: { xs: 2, sm: 3 } }}>
                <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: '24px', textAlign: 'center' }}>
                    <Warning sx={{ fontSize: { xs: 60, sm: 80 }, color: '#ff9800', mb: 2 }} />
                    <Typography variant={mobile ? "h6" : "h5"} fontWeight="bold" sx={{ mb: 2 }}>Signature manuscrite requise</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>Vous devez d'abord créer votre signature manuscrite.</Typography>
                    <Button variant="contained" onClick={() => window.location.href = '/user-dashboard?tab=ma-signature'} sx={{ bgcolor: '#1a237e' }}>
                        Créer ma signature
                    </Button>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto', p: { xs: 2, sm: 3 } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: '24px', textAlign: 'center' }}>
                
                <Box sx={{ mb: 4 }}>
                    <Typography variant={mobile ? "h5" : "h4"} sx={{ fontWeight: 800, color: '#1a237e', mb: 1 }}>
                        Auto-Signature
                    </Typography>
                    <Typography variant="body2" color="textSecondary">Cliquez sur le PDF pour positionner votre signature</Typography>
                    {hasSignature && (
                        <Alert severity="success" sx={{ mt: 2, borderRadius: '12px' }}>
                            ✅ Signature manuscrite trouvée
                        </Alert>
                    )}
                </Box>

                {!file && (
                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: { xs: '200px', sm: '250px' }, border: '2px dashed #1976d2', borderRadius: '20px', bgcolor: '#f0f7ff', cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { bgcolor: '#e3f2fd' } }}>
                        <CloudUpload sx={{ fontSize: { xs: 40, sm: 60 }, color: '#1976d2', mb: 2 }} />
                        <Typography variant={mobile ? "body1" : "h6"} sx={{ color: '#1976d2', fontWeight: 600 }}>Charger le PDF</Typography>
                        <Typography variant="caption" color="textSecondary">Format PDF uniquement</Typography>
                        <input type="file" hidden accept="application/pdf" onChange={(e) => { const selectedFile = e.target.files[0]; if (selectedFile) { setFile(selectedFile); setSignedFileUrl(null); } }} />
                    </Box>
                )}

                {file && (
                    <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <PictureAsPdf color="error" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    {file.name.length > (mobile ? 30 : 50) ? file.name.substring(0, mobile ? 30 : 50) + '...' : file.name}
                                </Typography>
                            </Stack>
                            {!signedFileUrl && (
                                <Button size="small" onClick={() => { setFile(null); setSignedFileUrl(null); setNumPages(null); }} color="error">
                                    Changer
                                </Button>
                            )}
                        </Stack>

                        <Box sx={{ height: { xs: '50vh', sm: '65vh' }, overflowY: 'auto', border: '1px solid #d1d1d1', bgcolor: '#525659', borderRadius: '12px' }}>
                            <Box ref={contentRef} onClick={!signedFileUrl ? handleCaptureCoords : undefined} sx={{ position: 'relative', cursor: !signedFileUrl ? 'crosshair' : 'default', display: 'inline-block', py: 2 }}>
                                <Document file={signedFileUrl || file} onLoadSuccess={onDocumentLoadSuccess} onLoadError={(error) => { console.error("Erreur PDF:", error); setSnackbar({ open: true, message: "Erreur chargement PDF", severity: 'error' }); }}>
                                    {Array.from(new Array(numPages), (el, index) => (<Page key={`p_${index + 1}`} pageNumber={index + 1} width={mobile ? 350 : 800} className="pdf-page-shadow" renderTextLayer={false} renderAnnotationLayer={false} sx={{ mb: 2 }} />))}
                                </Document>

                                {!signedFileUrl && coords.page && (
                                    <Box sx={{ position: 'absolute', left: coords.x - 70, top: (coords.page - 1) * (coords.displayPageHeight + 16) + coords.y - 25, width: '140px', height: '50px', border: '2px solid #1976d2', borderRadius: '4px', bgcolor: 'rgba(25, 118, 210, 0.15)', backdropFilter: 'blur(2px)', pointerEvents: 'none', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#0d47a1', fontWeight: 800, fontSize: '0.65rem' }}>Position signature</Typography>
                                        <HistoryEdu sx={{ fontSize: 18, color: '#0d47a1' }} />
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Box sx={{ mt: 4 }}>
                            {!signedFileUrl ? (
                                <Zoom in={!!file}>
                                    <Button variant="contained" onClick={handleAutoSign} disabled={loading} fullWidth={mobile} sx={{ borderRadius: '50px', px: { xs: 3, sm: 6 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.875rem', sm: '1.1rem' } }} startIcon={loading ? <CircularProgress size={24} /> : <HistoryEdu />}>
                                        {loading ? "Traitement..." : "Appliquer ma signature"}
                                    </Button>
                                </Zoom>
                            ) : (
                                <Stack direction="column" spacing={2} alignItems="center">
                                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', fontWeight: 700 }}>
                                        <CheckCircleOutline /> Document prêt
                                    </Typography>
                                    <Button variant="contained" color="success" href={signedFileUrl} download={`Signe_${file.name}`} fullWidth={mobile} sx={{ borderRadius: '50px', px: { xs: 3, sm: 6 } }} startIcon={<Download />}>
                                        Télécharger le PDF signé
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default AutoSignatureDocument;