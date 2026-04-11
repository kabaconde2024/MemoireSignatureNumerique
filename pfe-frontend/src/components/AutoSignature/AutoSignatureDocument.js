import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Button, Typography, Paper, CircularProgress, Stack, Zoom, Alert } from '@mui/material';
import { CloudUpload, Download, HistoryEdu, CheckCircleOutline, PictureAsPdf, Warning } from '@mui/icons-material';
import API from '../services/api';

// Configuration du worker
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

    // ✅ Fonction de vérification de signature (définie AVANT useEffect)
    const checkUserSignature = async () => {
        try {
            console.log("🔍 Vérification de la signature utilisateur...");
            const response = await API.get('/utilisateur/mon-profil');
            const userData = response.data;
            console.log("📋 Données utilisateur reçues:", { 
                email: userData.email, 
                hasSignature: !!(userData.imageSignature && userData.imageSignature !== '')
            });
            
            if (userData.imageSignature && userData.imageSignature !== '') {
                setHasSignature(true);
                console.log("✅ Signature trouvée");
            } else {
                setHasSignature(false);
                console.log("❌ Aucune signature trouvée");
            }
        } catch (error) {
            console.error("❌ Erreur vérification signature:", error);
            if (error.response?.status === 401) {
                console.log("⚠️ Session expirée");
                setSnackbar({ 
                    open: true, 
                    message: "Session expirée. Veuillez vous reconnecter.", 
                    severity: 'warning' 
                });
            }
            setHasSignature(false);
        } finally {
            setCheckingSignature(false);
        }
    };

    // ✅ Debug des cookies (optionnel)
    const debugCookies = () => {
        console.log("=== INSPECTION DES COOKIES ===");
        console.log("document.cookie brut:", document.cookie);
        
        if (document.cookie) {
            const cookies = document.cookie.split(';');
            console.log(`Nombre de cookies: ${cookies.length}`);
            cookies.forEach((cookie, index) => {
                const [name, value] = cookie.trim().split('=');
                console.log(`Cookie ${index + 1}: Nom: ${name}, Longueur: ${value?.length || 0}`);
            });
        } else {
            console.log("❌ Aucun cookie accessible via document.cookie (normal car httpOnly)");
        }
        
        // Vérifier l'authentification
        console.log("\nTest appel /auth/check:");
        API.get('/auth/check')
            .then(response => {
                console.log("✅ /auth/check réponse:", response.data);
            })
            .catch(error => {
                console.error("❌ /auth/check erreur:", error.response?.status, error.response?.data);
            });
    };

    // useEffect pour la vérification initiale
    useEffect(() => {
        debugCookies();
        checkUserSignature(); // ✅ Maintenant la fonction est définie
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (!file) {
            console.log("❌ Aucun fichier sélectionné");
            return;
        }
        
        console.log("=== DÉBUT AUTO-SIGNATURE ===");
        console.log("📄 Fichier:", file.name, `${(file.size / 1024).toFixed(2)} KB`);
        
        if (!hasSignature) {
            console.log("❌ Aucune signature trouvée en base");
            setSnackbar({ 
                open: true, 
                message: "❌ Vous n'avez pas de signature enregistrée. Veuillez d'abord créer votre signature manuscrite dans votre profil.", 
                severity: 'error' 
            });
            return;
        }
        
        setLoading(true);
        
        try {
            // 1. Upload du document
            console.log("📤 Upload du document...");
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadRes = await API.post('/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            console.log("✅ Upload réussi! Document ID:", uploadRes.data.id);
            
            // 2. Application de la signature
            console.log("✍️ Application de la signature...");
            
            const response = await API.post('/signature/appliquer-auto-signature', null, {
                params: {
                    documentId: uploadRes.data.id,
                    x: coords.x,
                    y: coords.y,
                    pageNumber: coords.page,
                    displayWidth: 800, 
                    displayHeight: coords.displayPageHeight
                },
                responseType: 'blob'
            });
            
            console.log("✅ Signature appliquée! Taille du PDF:", `${(response.data.size / 1024).toFixed(2)} KB`);
            
            // 3. Création de l'URL de téléchargement
            const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            setSignedFileUrl(url);
            
            setSnackbar({ 
                open: true, 
                message: "✅ Document signé avec succès !", 
                severity: 'success' 
            });
            
        } catch (err) {
            console.error("=== ERREUR DÉTAILLÉE ===");
            console.error("Status:", err.response?.status);
            console.error("Message:", err.response?.data?.erreur || err.message);
            
            let errorMsg = "Erreur lors de la signature";
            
            if (err.response?.status === 401) {
                errorMsg = "Session expirée. Veuillez vous reconnecter.";
            } else if (err.response?.status === 403) {
                errorMsg = "Accès non autorisé. Vérifiez vos droits.";
            } else if (err.response?.data?.erreur) {
                errorMsg = err.response.data.erreur;
            } else if (err.message) {
                errorMsg = err.message;
            }
            
            setSnackbar({ 
                open: true, 
                message: `❌ ${errorMsg}`, 
                severity: 'error' 
            });
        } finally { 
            setLoading(false);
            console.log("=== FIN AUTO-SIGNATURE ===\n");
        }
    };

    // Nettoyage de l'URL blob
    useEffect(() => {
        return () => {
            if (signedFileUrl) {
                URL.revokeObjectURL(signedFileUrl);
            }
        };
    }, [signedFileUrl]);

    // Affichage du message si pas de signature
    if (!checkingSignature && !hasSignature) {
        return (
            <Box sx={{ maxWidth: '1000px', mx: 'auto', p: 3 }}>
                <Paper elevation={0} sx={{ p: 4, borderRadius: '24px', textAlign: 'center', border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                    <Warning sx={{ fontSize: 80, color: '#ff9800', mb: 2 }} />
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#e65100' }}>
                        Signature manuscrite requise
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                        Vous devez d'abord créer votre signature manuscrite avant de pouvoir utiliser l'auto-signature.
                    </Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => window.location.href = '/user-dashboard?tab=ma-signature'}
                        sx={{ bgcolor: '#1a237e', px: 4, py: 1.5 }}
                    >
                        Créer ma signature manuscrite
                    </Button>
                </Paper>
            </Box>
        );
    }

    // Suite du rendu...
    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto', p: 3 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: '24px', textAlign: 'center', border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e', mb: 1 }}>
                        Auto-Signature
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Cliquez sur le PDF pour positionner votre signature
                    </Typography>
                    {hasSignature && (
                        <Alert severity="success" sx={{ mt: 2, borderRadius: '12px' }}>
                            ✅ Signature manuscrite trouvée - Cliquez sur le document pour placer votre signature
                        </Alert>
                    )}
                </Box>

                {!file && (
                    <Box 
                        component="label"
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '250px',
                            border: '2px dashed #1976d2',
                            borderRadius: '20px',
                            bgcolor: '#f0f7ff',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': { bgcolor: '#e3f2fd', transform: 'scale(1.01)', borderColor: '#0d47a1' }
                        }}
                    >
                        <CloudUpload sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600 }}>
                            Cliquez pour charger le PDF
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Format PDF uniquement (max 10MB)
                        </Typography>
                        <input 
                            type="file" 
                            hidden 
                            accept="application/pdf" 
                            onChange={(e) => {
                                const selectedFile = e.target.files[0];
                                if (selectedFile) {
                                    console.log("📁 Fichier sélectionné:", selectedFile.name);
                                    setFile(selectedFile);
                                    setSignedFileUrl(null);
                                }
                            }} 
                        />
                    </Box>
                )}

                {file && (
                    <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <PictureAsPdf color="error" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{file.name}</Typography>
                            </Stack>
                            {!signedFileUrl && (
                                <Button 
                                    size="small" 
                                    onClick={() => {
                                        setFile(null);
                                        setSignedFileUrl(null);
                                        setNumPages(null);
                                    }} 
                                    color="error"
                                >
                                    Changer de fichier
                                </Button>
                            )}
                        </Stack>

                        <Box sx={{ 
                            height: '65vh', 
                            overflowY: 'auto', 
                            border: '1px solid #d1d1d1', 
                            bgcolor: '#525659', 
                            borderRadius: '12px',
                            boxShadow: 'inset 0px 2px 10px rgba(0,0,0,0.1)'
                        }}>
                            <Box 
                                ref={contentRef} 
                                onClick={!signedFileUrl ? handleCaptureCoords : undefined} 
                                sx={{ 
                                    position: 'relative', 
                                    cursor: !signedFileUrl ? 'crosshair' : 'default', 
                                    display: 'inline-block', 
                                    py: 2 
                                }}
                            >
                                <Document 
                                    file={signedFileUrl || file} 
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={(error) => {
                                        console.error("❌ Erreur chargement PDF:", error);
                                        setSnackbar({ 
                                            open: true, 
                                            message: "Erreur lors du chargement du PDF", 
                                            severity: 'error' 
                                        });
                                    }}
                                >
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

                                {!signedFileUrl && coords.page && (
                                    <Box sx={{
                                        position: 'absolute', 
                                        left: coords.x - 70, 
                                        top: (coords.page - 1) * (coords.displayPageHeight + 16) + coords.y - 25,
                                        width: '140px', 
                                        height: '50px', 
                                        border: '2px solid #1976d2',
                                        borderRadius: '4px',
                                        bgcolor: 'rgba(25, 118, 210, 0.15)', 
                                        backdropFilter: 'blur(2px)',
                                        pointerEvents: 'none', 
                                        zIndex: 10,
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        boxShadow: '0px 4px 10px rgba(0,0,0,0.2)'
                                    }}>
                                        <Typography variant="caption" sx={{ color: '#0d47a1', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                            Position de signature
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
                                        sx={{ 
                                            borderRadius: '50px', 
                                            px: 6, 
                                            py: 1.5, 
                                            fontSize: '1.1rem',
                                            textTransform: 'none',
                                            boxShadow: '0px 8px 20px rgba(25, 118, 210, 0.3)'
                                        }}
                                        startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <HistoryEdu />}
                                    >
                                        {loading ? "Traitement en cours..." : "Appliquer ma signature"}
                                    </Button>
                                </Zoom>
                            ) : (
                                <Stack direction="column" spacing={2} alignItems="center">
                                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', fontWeight: 700 }}>
                                        <CheckCircleOutline /> Document prêt à être téléchargé
                                    </Typography>
                                    <Button 
                                        variant="contained" 
                                        color="success" 
                                        href={signedFileUrl} 
                                        download={`Signe_${file.name}`}
                                        sx={{ borderRadius: '50px', px: 6, py: 1.5, fontSize: '1.1rem', textTransform: 'none' }}
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
                    }
                `}
            </style>
        </Box>
    );
};

export default AutoSignatureDocument;