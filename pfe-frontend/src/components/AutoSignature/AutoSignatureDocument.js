import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Button, Typography, Paper, CircularProgress, Stack, IconButton, Tooltip, Zoom, Alert } from '@mui/material';
import { CloudUpload, Download, HistoryEdu, CheckCircleOutline, PictureAsPdf, Warning } from '@mui/icons-material';
import axios from 'axios';

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

    const API_BASE_URL = 'https://memoiresignaturenumerique.onrender.com/api';

    // Fonction utilitaire pour récupérer le token du cookie
    const getAccessToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'accessToken') {
                return value;
            }
        }
        return null;
    };

    // Configuration d'axios avec le token
    const createAxiosConfig = () => {
        const token = getAccessToken();
        return {
            withCredentials: true,
            headers: token ? {
                'Authorization': `Bearer ${token}`
            } : {}
        };
    };

    // ✅ Vérifier si l'utilisateur a une signature enregistrée
    useEffect(() => {
        const checkUserSignature = async () => {
            try {
                const config = createAxiosConfig();
                const response = await axios.get(`${API_BASE_URL}/utilisateur/mon-profil`, config);
                const userData = response.data;
                if (userData.imageSignature && userData.imageSignature !== '') {
                    setHasSignature(true);
                } else {
                    setHasSignature(false);
                }
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

    // Fonction de debug pour inspecter tous les cookies
const debugCookies = () => {
    console.log("=== INSPECTION DES COOKIES ===");
    console.log("document.cookie brut:", document.cookie);
    
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        console.log(`Nombre de cookies: ${cookies.length}`);
        cookies.forEach((cookie, index) => {
            const [name, value] = cookie.trim().split('=');
            console.log(`Cookie ${index + 1}:`);
            console.log(`  Nom: ${name}`);
            console.log(`  Valeur: ${value ? value.substring(0, 30) + '...' : 'vide'}`);
            console.log(`  Longueur: ${value?.length || 0}`);
        });
    } else {
        console.log("❌ Aucun cookie accessible via document.cookie");
        console.log("   (Normal si les cookies sont HttpOnly)");
    }
    
    // Vérifier si on peut accéder à l'API auth/check
    console.log("\nTest appel /auth/check:");
    axios.get(`${API_BASE_URL}/auth/check`, { withCredentials: true })
        .then(response => {
            console.log("✅ /auth/check réponse:", response.data);
        })
        .catch(error => {
            console.error("❌ /auth/check erreur:", error.response?.status, error.response?.data);
        });
};

// Appeler cette fonction au chargement du composant
useEffect(() => {
    debugCookies();
    checkUserSignature();
}, []);
const handleAutoSign = async () => {
    if (!file) return;
    
    // ✅ LOG POUR DEBUG
    console.log("=== DÉBUT AUTO-SIGNATURE ===");
    console.log("1. Vérification du fichier:", file.name, file.size, "bytes");
    
    // Vérifier la signature
    if (!hasSignature) {
        console.log("2. Aucune signature trouvée en base");
        setSnackbar({ 
            open: true, 
            message: "❌ Vous n'avez pas de signature enregistrée. Veuillez d'abord créer votre signature manuscrite dans votre profil.", 
            severity: 'error' 
        });
        return;
    }
    console.log("2. Signature trouvée en base");
    
    // Récupération du token
    const token = getAccessToken();
    console.log("3. Token récupéré:", token ? `${token.substring(0, 50)}...` : "❌ NON");
    console.log("4. Tous les cookies (document.cookie):", document.cookie || "Aucun cookie accessible");
    console.log("5. Longueur de document.cookie:", document.cookie?.length || 0);
    
    // Vérifier si des cookies existent
    if (document.cookie) {
        const cookiesList = document.cookie.split(';');
        console.log("6. Liste des cookies accessibles:", cookiesList.map(c => c.trim().split('=')[0]));
    }
    
    if (!token) {
        console.error("7. ❌ TOKEN NON TROUVÉ - Impossible de continuer");
        setSnackbar({ 
            open: true, 
            message: "❌ Session expirée. Veuillez vous reconnecter.", 
            severity: 'error' 
        });
        return;
    }
    console.log("7. ✅ Token trouvé avec succès");
    
    setLoading(true);
    
    try {
        console.log("8. Configuration axios avec token");
        const config = createAxiosConfig();
        console.log("8a. Headers configurés:", Object.keys(config.headers || {}));
        console.log("8b. withCredentials:", config.withCredentials);
        
        const formData = new FormData();
        formData.append('file', file);
        console.log("9. FormData créé avec le fichier");
        
        console.log("10. Envoi de la requête upload vers:", `${API_BASE_URL}/documents/upload`);
        const uploadRes = await axios.post(`${API_BASE_URL}/documents/upload`, formData, config);
        
        console.log("11. ✅ Upload réussi! Document ID:", uploadRes.data.id);
        console.log("11a. Réponse complète:", uploadRes.data);
        
        console.log("12. Envoi de la requête signature avec les paramètres:", {
            documentId: uploadRes.data.id,
            x: coords.x,
            y: coords.y,
            pageNumber: coords.page,
            displayWidth: 800,
            displayHeight: coords.displayPageHeight
        });
        
        const response = await axios.post(`${API_BASE_URL}/signature/appliquer-auto-signature`, null, {
            params: {
                documentId: uploadRes.data.id,
                x: coords.x,
                y: coords.y,
                pageNumber: coords.page,
                displayWidth: 800, 
                displayHeight: coords.displayPageHeight
            },
            responseType: 'blob',
            ...config
        });
        
        console.log("13. ✅ Signature appliquée! Taille du PDF signé:", response.data.size, "bytes");
        
        const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        setSignedFileUrl(url);
        console.log("14. URL du PDF signé créée");
        
        setSnackbar({ open: true, message: "✅ Document signé avec succès !", severity: 'success' });
        
    } catch (err) {
        console.error("=== ERREUR DÉTAILLÉE ===");
        console.error("15. ❌ Erreur lors du processus:");
        console.error("15a. Message:", err.message);
        console.error("15b. Code d'erreur:", err.code);
        console.error("15c. Status:", err.response?.status);
        console.error("15d. Status text:", err.response?.statusText);
        console.error("15e. Headers de réponse:", err.response?.headers);
        console.error("15f. Données de l'erreur:", err.response?.data);
        
        if (err.response?.status === 403) {
            console.error("16. 🔒 ERREUR 403 - Forbidden");
            console.error("16a. URL:", err.config?.url);
            console.error("16b. Méthode:", err.config?.method);
            console.error("16c. Headers envoyés:", err.config?.headers);
            console.error("16d. Token envoyé dans headers?", err.config?.headers?.Authorization ? "OUI" : "NON");
            console.error("16e. WithCredentials activé?", err.config?.withCredentials);
        }
        
        const errorMsg = err.response?.data?.erreur || err.response?.data?.message || err.message || "Erreur lors de la signature";
        console.error("17. Message d'erreur final:", errorMsg);
        
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally { 
        setLoading(false);
        console.log("18. Fin du processus - loading désactivé");
        console.log("=== FIN AUTO-SIGNATURE ===\n");
    }
};

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

    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto', p: 3 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: '24px', textAlign: 'center', border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e', mb: 1 }}>
                        Auto-Signature
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Placez votre signature enregistrée n'importe où sur le document
                    </Typography>
                    {hasSignature && (
                        <Alert severity="success" sx={{ mt: 2, borderRadius: '12px' }}>
                            ✅ Signature manuscrite trouvée - Vous pouvez signer automatiquement
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
                        <input type="file" hidden accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
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
                                <Button size="small" onClick={() => {setFile(null); setSignedFileUrl(null);}} color="error">
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