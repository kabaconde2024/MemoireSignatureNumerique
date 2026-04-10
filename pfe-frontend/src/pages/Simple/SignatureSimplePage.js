// src/pages/simple/SignatureSimplePage.jsx
// Version SIMPLE UNIQUEMENT - Pas de code PKI
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import SignatureCanvas from 'react-signature-canvas';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Gestionnaire pour l'erreur ResizeObserver
const handleResizeObserverError = (e) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
        e.stopImmediatePropagation();
        return true;
    }
    return false;
};

window.addEventListener('error', handleResizeObserverError);

const SignatureSimplePage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const sigCanvas = useRef(null);
    const viewerRef = useRef(null);
    const [totalPages, setTotalPages] = useState(1);
    
    const [invitation, setInvitation] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [accepted, setAccepted] = useState(false);
    const [signatureMode, setSignatureMode] = useState('draw');
    const [signatureText, setSignatureText] = useState('');
    const [uploadedImage, setUploadedImage] = useState(null);
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [showPositionSelector, setShowPositionSelector] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [downloadedFileName, setDownloadedFileName] = useState('');

    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    const textToImage = (text) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 100;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '30px "Dancing Script", cursive';
            ctx.fillStyle = 'black';
            ctx.fillText(text, 10, 60);
            resolve(canvas.toDataURL('image/png'));
        });
    };

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`https://memoiresignaturenumerique.onrender.com/api/signature/details/${token}`);
                
                // ✅ Vérifier si l'invitation a expiré
                if (res.data.dateExpiration && new Date(res.data.dateExpiration) < new Date()) {
                    alert("Cette invitation a expiré. Veuillez contacter l'expéditeur pour une nouvelle invitation.");
                    navigate('/');
                    return;
                }
                
                setInvitation(res.data);
                setSignatureText(`${res.data.prenomSignataire} ${res.data.nomSignataire}`);
                setPdfUrl(`https://memoiresignaturenumerique.onrender.com/api/signature/apercu/${token}`);
            } catch (err) {
                console.error("Erreur:", err);
                alert("Erreur lors du chargement des détails de la signature");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
        
        return () => {
            window.removeEventListener('error', handleResizeObserverError);
        };
    }, [token, navigate]);

    const handlePdfClick = (event) => {
        if (!showPositionSelector) return;

        const clientX = event.clientX;
        const clientY = event.clientY;
        const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
        
        const pageLayer = elementsAtPoint.find(el => 
            el.classList.contains('rpv-core__page-layer') || 
            el.classList.contains('rpv-core__inner-page')
        );

        if (!pageLayer) {
            alert("Cliquez bien sur le document (la zone blanche).");
            return;
        }

        let pageIndex = null;

        const attr = pageLayer.getAttribute('data-page-index');
        if (attr !== null) {
            pageIndex = parseInt(attr, 10);
        } else {
            const parentWithIndex = pageLayer.closest('[data-page-index]');
            if (parentWithIndex) {
                pageIndex = parseInt(parentWithIndex.getAttribute('data-page-index'), 10);
            }
        }

        if (pageIndex === null || isNaN(pageIndex)) {
            const allPageLayers = Array.from(document.querySelectorAll('.rpv-core__page-layer'));
            const foundIndex = allPageLayers.indexOf(pageLayer.closest('.rpv-core__page-layer') || pageLayer);
            if (foundIndex !== -1) {
                pageIndex = foundIndex;
            }
        }

        if (pageIndex === null || isNaN(pageIndex)) {
            alert("Erreur technique : Impossible de lire le numéro de page.");
            return;
        }

        const actualPageNumber = pageIndex + 1;
        const rect = pageLayer.getBoundingClientRect();
        
        const xPx = clientX - rect.left;
        const yPx = clientY - rect.top;

        console.log(`🎯 Cible verrouillée ! Page: ${actualPageNumber}, X: ${xPx}, Y: ${yPx}`);

        setSelectedPosition({ 
            x: xPx,
            y: yPx,
            pageNumber: actualPageNumber,
            containerWidth: rect.width,
            containerHeight: rect.height
        });
        
        setShowPositionSelector(false);
    };

const handleSendOtp = async () => {
    if (!invitation?.emailDestinataire) { // Vérifie l'email au lieu du téléphone
        alert("Adresse email non trouvée");
        return;
    }
    
    try {
        setLoading(true);
        await axios.post(`https://memoiresignaturenumerique.onrender.com/api/signature/send-otp?token=${token}`);
        setIsOtpSent(true);
        alert(`✅ Code de sécurité envoyé à : ${invitation.emailDestinataire}`);
    } catch (err) {
        alert("❌ Erreur lors de l'envoi de l'email.");
    } finally {
        setLoading(false);
    }
};

    const downloadFile = (blob, fileName) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    };

    // ✅ Signature simple (avec image)
    const handleSimpleSign = async () => {
        console.log("=== DÉBUT SIGNATURE SIMPLE ===");
        
        if (!accepted) {
            alert("Veuillez accepter les termes de signature");
            return;
        }
        
        if (!selectedPosition) {
            alert("Veuillez d'abord sélectionner l'emplacement de la signature");
            return;
        }
        
        if (!isOtpSent) {
            alert("Veuillez d'abord demander un code OTP");
            return;
        }
        
        if (!otp || otp.length < 4) {
            alert("Veuillez saisir un code OTP valide (4 chiffres minimum)");
            return;
        }
        
        let signatureImage = null;
        
        if (signatureMode === 'draw' && sigCanvas.current) {
            const canvas = sigCanvas.current.getCanvas();
            if (!canvas) {
                alert("Veuillez dessiner votre signature avant de continuer.");
                return;
            }
            const context = canvas.getContext('2d');
            const pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
            const hasDrawing = Array.from(pixelData).some(value => value !== 0);
            
            if (!hasDrawing) {
                alert("Veuillez dessiner votre signature avant de continuer.");
                return;
            }
            
            signatureImage = canvas.toDataURL('image/png');
            console.log("Signature dessinée récupérée");
        } else if (signatureMode === 'text') {
            if (!signatureText || signatureText.trim() === '') {
                alert("Veuillez saisir votre nom pour la signature.");
                return;
            }
            signatureImage = await textToImage(signatureText);
            console.log("Signature texte convertie en image");
        } else if (uploadedImage) {
            signatureImage = uploadedImage;
            console.log("Signature image chargée");
        } else {
            alert("Veuillez fournir une signature (dessinée, texte ou image).");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                token: token,
                otp: otp,
                nom: signatureText,
              //  telephone: invitation.telephone,
                email: invitation.emailDestinataire, // <--- Utilise l'email comme identifiant
                x: selectedPosition.x,
                y: selectedPosition.y,
                pageNumber: selectedPosition.pageNumber,
                displayWidth: selectedPosition.containerWidth,
                displayHeight: selectedPosition.containerHeight,
                signatureImage: signatureImage
            };

            const response = await axios.post(
                'https://memoiresignaturenumerique.onrender.com/api/signature/valider-simple', 
                payload, 
                { responseType: 'blob' }
            );

            const contentType = response.headers['content-type'];
            if (contentType && contentType.includes('application/pdf')) {
                const fileName = `Signé_${invitation.nomDocument || 'document'}.pdf`;
                setDownloadedFileName(fileName);
                downloadFile(response.data, fileName);
                setShowSuccessModal(true);
            } else {
                throw new Error("Le fichier reçu n'est pas un PDF valide");
            }
        } catch (err) {
            console.error("Erreur signature:", err);
            let errorMessage = "Erreur lors de la signature. ";
            if (err.response?.data?.erreur) {
                errorMessage += err.response.data.erreur;
            } else if (err.message) {
                errorMessage += err.message;
            } else {
                errorMessage += "Vérifiez votre connexion et réessayez.";
            }
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        navigate('/');
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("L'image est trop volumineuse. Taille maximale: 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result);
                setSignatureMode('upload');
            };
            reader.readAsDataURL(file);
        }
    };

    const clearSignature = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    if (!invitation) return <div style={{ padding: '50px', textAlign: 'center' }}>Chargement sécurisé...</div>;

    const isSignButtonDisabled = loading;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f4f7f9' }}>
            
            {/* Modal de succès */}
            {showSuccessModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '400px',
                        textAlign: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <div style={{ fontSize: '50px', marginBottom: '15px' }}>✅</div>
                        <h2 style={{ color: '#28a745', marginBottom: '10px' }}>Signature réussie !</h2>
                        <p style={{ marginBottom: '15px', color: '#666' }}>
                            Le document <strong>{downloadedFileName}</strong> a été signé avec succès.
                        </p>
                        <p style={{ marginBottom: '20px', fontSize: '14px', color: '#888' }}>
                            Le fichier a été téléchargé automatiquement.
                        </p>
                        <button
                            onClick={handleCloseSuccessModal}
                            style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '6px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Retour à l'accueil
                        </button>
                    </div>
                </div>
            )}

            {/* Bannière */}
            <div style={{ backgroundColor: 'white', padding: '10px 40px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <img src="/logo-ngsign.png" alt="NGSign" style={{ height: '35px' }} />
                <div style={{ fontSize: '13px', textAlign: 'right' }}>
                    <strong>{invitation.nomDocument}</strong><br/>
                    <span style={{ color: '#666' }}>ID: {token.substring(0, 8)}...</span>
                    {invitation.dateExpiration && (
                        <div style={{ color: new Date(invitation.dateExpiration) < new Date() ? '#dc3545' : '#ffc107', fontSize: '10px', marginTop: '2px' }}>
                            ⏰ Expire le: {new Date(invitation.dateExpiration).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                <div 
                    style={{ flex: 2.5, backgroundColor: '#525659', padding: '20px', overflowY: 'auto', cursor: showPositionSelector ? 'crosshair' : 'default' }}
                    onClick={handlePdfClick}
                >
                    <div ref={viewerRef} style={{ backgroundColor: 'white', maxWidth: '900px', margin: '0 auto', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', position: 'relative' }}>
                        {pdfUrl && (
                            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                                <Viewer 
                                    fileUrl={pdfUrl} 
                                    plugins={[defaultLayoutPluginInstance]}
                                    onDocumentLoad={(e) => {
                                        console.log("Document chargé, pages:", e.doc.numPages);
                                        setTotalPages(e.doc.numPages);
                                    }}
                                />
                            </Worker>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, backgroundColor: 'white', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column', padding: '25px', overflowY: 'auto' }}>
                    
                    <h3>Finaliser la signature</h3>
                    
                    <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                        <label style={{ display: 'flex', cursor: 'pointer', gap: '10px', fontSize: '14px' }}>
                            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                            Je reconnais avoir lu le document et j'accepte les termes de signature électronique
                        </label>
                    </div>

                    {accepted && (
                        <div>
                            
                            <button 
                                onClick={() => setShowPositionSelector(true)} 
                                style={{ 
                                    ...primaryBtnStyle, 
                                    backgroundColor: selectedPosition ? '#28a745' : '#ffc107',
                                    color: selectedPosition ? 'white' : 'black',
                                    marginBottom: '10px'
                                }}
                            >
                                {selectedPosition ? `✅ Emplacement sélectionné (Page ${selectedPosition.pageNumber})` : "📍 Cliquez ici pour choisir l'emplacement"}
                            </button>
                            
                            {showPositionSelector && (
                                <div style={{ backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px', marginBottom: '15px', fontSize: '12px', textAlign: 'center', color: '#856404' }}>
                                    🔍 Mode sélection - Naviguez vers la page souhaitée et cliquez DIRECTEMENT sur le document PDF
                                </div>
                            )}
                            
                            {selectedPosition && (
                                <div style={{ backgroundColor: '#d4edda', padding: '8px', borderRadius: '4px', marginBottom: '15px', fontSize: '12px', textAlign: 'center', color: '#155724' }}>
                                    ✓ Signature placée sur la page {selectedPosition.pageNumber} à X:{Math.round(selectedPosition.x)}px Y:{Math.round(selectedPosition.y)}px
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
                                <button onClick={() => setSignatureMode('draw')} style={{ ...btnIconStyle, backgroundColor: signatureMode === 'draw' ? '#e9ecef' : '#fff' }}>✏️</button>
                                <button onClick={() => setSignatureMode('text')} style={{ ...btnIconStyle, backgroundColor: signatureMode === 'text' ? '#e9ecef' : '#fff' }}>📝 Texte</button>
                                <label style={{ ...btnIconStyle, cursor: 'pointer', backgroundColor: signatureMode === 'upload' ? '#e9ecef' : '#fff' }}>
                                    🖼️ <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                                </label>
                            </div>

                            <div style={{ border: '1px solid #ddd', height: '140px', backgroundColor: '#fafafa', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
                                {signatureMode === 'draw' && (
                                    <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{ width: 350, height: 130 }} />
                                )}
                                {signatureMode === 'text' && (
                                    <input 
                                        style={{ fontFamily: '"Dancing Script", cursive', fontSize: '28px', border: 'none', background: 'transparent', textAlign: 'center', width: '90%', outline: 'none' }}
                                        value={signatureText}
                                        onChange={(e) => setSignatureText(e.target.value)}
                                        placeholder="Votre signature"
                                    />
                                )}
                                {signatureMode === 'upload' && uploadedImage && (
                                    <img src={uploadedImage} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%' }} />
                                )}
                                {signatureMode === 'upload' && !uploadedImage && (
                                    <span style={{ color: '#999', fontSize: '12px' }}>Cliquez sur l'icône 🖼️ pour importer une image</span>
                                )}
                            </div>
                            
                            {signatureMode === 'draw' && (
                                <button onClick={clearSignature} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#888', width: '100%', marginTop: '5px', cursor: 'pointer' }}>
                                    Effacer le dessin
                                </button>
                            )}

                            <div style={{ marginTop: '25px' }}>
                                {!isOtpSent ? (
                                    <button onClick={handleSendOtp} style={primaryBtnStyle} disabled={loading}>
                                        {loading ? "Envoi en cours..." : "📱 Recevoir le code par Email"}
                                    </button>
                                ) : (
                                    <>
                                        <p style={{ fontSize: '12px', textAlign: 'center', color: '#666' }}>
Entrez le code reçu à l'adresse {invitation.emailDestinataire}                                        </p>
                                        <input 
                                            type="text" 
                                            placeholder="123456" 
                                            value={otp} 
                                            onChange={(e) => setOtp(e.target.value)}
                                            style={otpInputStyle}
                                            autoFocus
                                        />
                                        <button onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: '#007bff', fontSize: '12px', width: '100%', cursor: 'pointer', marginBottom: '15px' }}>
                                            Renvoyer le code
                                        </button>
                                        
                                        <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '11px' }}>
                                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Prérequis avant signature :</p>
                                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                <li style={{ color: accepted ? '#28a745' : '#dc3545' }}>✓ Acceptation des termes</li>
                                                <li style={{ color: selectedPosition ? '#28a745' : '#dc3545' }}>✓ Emplacement de signature choisi</li>
                                                <li style={{ color: isOtpSent ? '#28a745' : '#dc3545' }}>✓ Code OTP reçu</li>
                                                <li style={{ color: otp.length >= 4 ? '#28a745' : '#dc3545' }}>✓ Code OTP saisi ({otp.length}/4)</li>
                                            </ul>
                                        </div>
                                        
                                        <button onClick={handleSimpleSign} disabled={isSignButtonDisabled} style={{ ...primaryBtnStyle, backgroundColor: '#28a745', color: 'white', fontSize: '16px', padding: '15px' }}>
                                            {loading ? "Signature en cours..." : "✅ SIGNER LE DOCUMENT"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '11px', color: '#28a745', paddingTop: '20px' }}>
                        🛡️ Conformité ISO 27005 - Sécurisé par TrustSign
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .rpv-core__viewer { cursor: ${showPositionSelector ? 'crosshair' : 'default'}; }
                .rpv-core__page-layer canvas { cursor: ${showPositionSelector ? 'crosshair' : 'default'}; }
            `}</style>
        </div>
    );
};

const btnIconStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: '#fff'
};

const primaryBtnStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const otpInputStyle = {
    width: '100%',
    padding: '12px',
    fontSize: '20px',
    textAlign: 'center',
    letterSpacing: '6px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginBottom: '10px'
};

export default SignatureSimplePage;