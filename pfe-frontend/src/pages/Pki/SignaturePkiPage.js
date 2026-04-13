// src/pages/pki/SignaturePkiPage.jsx
// Version PKI UNIQUEMENT - Pour utilisateurs INSCRITS avec certificat actif
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const SignaturePkiPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const viewerRef = useRef(null);
    
    // ✅ TOUS les useState en premier
    const [totalPages, setTotalPages] = useState(1);
    const [invitation, setInvitation] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [accepted, setAccepted] = useState(false);
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [showPositionSelector, setShowPositionSelector] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [downloadedFileName, setDownloadedFileName] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasCertificat, setHasCertificat] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    
    // ✅ États pour la vérification du certificat expéditeur
    const [certificatExpediteurValide, setCertificatExpediteurValide] = useState(null);
    const [verificationExpediteur, setVerificationExpediteur] = useState(null);
    
    // Responsive states
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024 && window.innerWidth > 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    // 1. Vérifier authentification et certificat
    useEffect(() => {
        const checkAuthAndCertificat = async () => {
            try {
                const authRes = await axios.get('https://memoiresignaturenumerique.onrender.com/api/auth/check', { withCredentials: true });
                
                if (!authRes.data.authentifie) {
                    navigate(`/connexion?redirect=/signature-pki/${token}`);
                    return;
                }
                setIsAuthenticated(true);
                
                const certRes = await axios.get('https://memoiresignaturenumerique.onrender.com/api/utilisateur/pki/mon-statut', { withCredentials: true });
                
                if (certRes.data.status !== 'ACTIVE') {
                    alert("Vous devez avoir un certificat actif pour utiliser la signature PKI. Veuillez en faire la demande dans votre tableau de bord.");
                    navigate('/user-dashboard');
                    return;
                }
                setHasCertificat(true);
                
                const invRes = await axios.get(`https://memoiresignaturenumerique.onrender.com/api/signature/details/${token}`);
                
                // ✅ Vérifier si l'invitation a expiré
                if (invRes.data.dateExpiration && new Date(invRes.data.dateExpiration) < new Date()) {
                    alert("Cette invitation a expiré. Veuillez contacter l'expéditeur pour une nouvelle invitation.");
                    navigate('/');
                    return;
                }
                
                setInvitation(invRes.data);
                setPdfUrl(`https://memoiresignaturenumerique.onrender.com/api/signature/apercu/${token}`);
                
            } catch (err) {
                console.error("Erreur de vérification:", err);
                navigate('/connexion');
            } finally {
                setCheckingAuth(false);
            }
        };
        
        checkAuthAndCertificat();
    }, [token, navigate]);

    // 2. Vérifier le certificat de l'expéditeur
    useEffect(() => {
        const verifierCertificatExpediteur = async () => {
            if (!invitation) return;
            
            try {
                const response = await axios.get(
                    `https://memoiresignaturenumerique.onrender.com/api/signature/verifier-certificat-expediteur/${token}`,
                    { withCredentials: true }
                );
                setCertificatExpediteurValide(response.data.valide);
                setVerificationExpediteur(response.data);
                
                if (!response.data.valide) {
                    console.warn("Certificat expéditeur invalide:", response.data.message);
                }
            } catch (err) {
                console.error("Erreur vérification certificat expéditeur:", err);
                setCertificatExpediteurValide(false);
            }
        };
        
        verifierCertificatExpediteur();
    }, [invitation, token]);

    // 3. Sélection de l'emplacement de signature
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

        console.log(`🎯 Emplacement PKI - Page: ${actualPageNumber}, X: ${xPx}, Y: ${yPx}`);

        setSelectedPosition({ 
            x: xPx,
            y: yPx,
            pageNumber: actualPageNumber,
            containerWidth: rect.width,
            containerHeight: rect.height
        });
        
        setShowPositionSelector(false);
    };

    // 4. Envoi du code OTP
    const handleSendOtp = async () => {
        if (!invitation?.emailDestinataire) {
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

    // 5. Téléchargement du fichier
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

    // 6. Signature PKI (avec certificat)
    const handlePkiSign = async () => {
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

        setLoading(true);
        try {
            const payload = {
                token: token,
                otp: otp,
                x: selectedPosition.x,
                y: selectedPosition.y,
                pageNumber: selectedPosition.pageNumber,
                displayWidth: selectedPosition.containerWidth,
                displayHeight: selectedPosition.containerHeight
            };

            console.log("📤 Envoi signature PKI:", payload);

            const endpoint = 'https://memoiresignaturenumerique.onrender.com/api/signature/pki/executer';
            
            const pkiResponse = await axios.post(endpoint, payload, { 
                withCredentials: true,
                responseType: 'blob'
            });

            const contentType = pkiResponse.headers['content-type'];
            if (contentType && contentType.includes('application/pdf')) {
                const fileName = `Signé_PKI_${invitation.nomDocument || 'document'}.pdf`;
                setDownloadedFileName(fileName);
                downloadFile(pkiResponse.data, fileName);
                setShowSuccessModal(true);
            } else {
                throw new Error("Le fichier reçu n'est pas un PDF valide");
            }
        } catch (err) {
            console.error("Erreur signature PKI:", err);
            let errorMessage = "Erreur lors de la signature PKI. ";
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
        navigate('/user-dashboard');
    };

    // Styles responsives
    const bannerStyles = {
        backgroundColor: 'white',
        padding: isMobile ? '10px 15px' : '10px 40px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: isMobile ? '10px' : '0'
    };

    const logoStyles = {
        height: isMobile ? '25px' : '35px'
    };

    const infoTextStyles = {
        fontSize: isMobile ? '10px' : '13px',
        textAlign: isMobile ? 'left' : 'right'
    };

    const mainContainerStyles = {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        flexDirection: isMobile ? 'column' : 'row'
    };

    const pdfContainerStyles = {
        flex: isMobile ? '1' : '2.5',
        backgroundColor: '#525659',
        padding: isMobile ? '10px' : '20px',
        overflowY: 'auto',
        cursor: showPositionSelector ? 'crosshair' : 'default',
        minHeight: isMobile ? '400px' : 'auto'
    };

    const signaturePanelStyles = {
        flex: isMobile ? '1' : '1',
        backgroundColor: 'white',
        borderLeft: isMobile ? 'none' : '1px solid #ddd',
        borderTop: isMobile ? '1px solid #ddd' : 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '15px' : '25px',
        overflowY: 'auto',
        maxHeight: isMobile ? '60vh' : 'auto'
    };

    const titleStyles = {
        fontSize: isMobile ? '18px' : '24px',
        marginBottom: '15px',
        color: '#2e7d32'
    };

    const successModalStyles = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: isMobile ? '20px' : '0'
    };

    const modalContentStyles = {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: isMobile ? '20px' : '30px',
        maxWidth: isMobile ? '90%' : '400px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        animation: 'fadeIn 0.3s ease'
    };

    const alertBannerStyles = {
        backgroundColor: certificatExpediteurValide ? '#d4edda' : '#f8d7da',
        color: certificatExpediteurValide ? '#155724' : '#721c24',
        padding: isMobile ? '8px 15px' : '8px 15px',
        margin: isMobile ? '10px 15px 0 15px' : '10px 40px 0 40px',
        borderRadius: '4px',
        fontSize: isMobile ? '10px' : '12px',
        textAlign: 'center'
    };

    // ✅ Vérifications avant affichage
    if (checkingAuth) {
        return <div style={{ padding: '50px', textAlign: 'center' }}>Vérification de votre identité...</div>;
    }

    if (!isAuthenticated || !hasCertificat) {
        return null;
    }

    if (!invitation) return <div style={{ padding: '50px', textAlign: 'center' }}>Chargement sécurisé...</div>;

    const isSignButtonDisabled = loading;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f4f7f9' }}>
            
            {/* Modal de succès */}
            {showSuccessModal && (
                <div style={successModalStyles}>
                    <div style={modalContentStyles}>
                        <div style={{ fontSize: isMobile ? '40px' : '50px', marginBottom: '15px' }}>✅</div>
                        <h2 style={{ color: '#28a745', marginBottom: '10px', fontSize: isMobile ? '20px' : '24px' }}>Signature PKI réussie !</h2>
                        <p style={{ marginBottom: '15px', color: '#666', fontSize: isMobile ? '12px' : '14px' }}>
                            Le document <strong>{downloadedFileName}</strong> a été signé avec votre certificat numérique.
                        </p>
                        <p style={{ marginBottom: '20px', fontSize: isMobile ? '11px' : '14px', color: '#888' }}>
                            Le fichier a été téléchargé automatiquement.
                        </p>
                        <button
                            onClick={handleCloseSuccessModal}
                            style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: isMobile ? '10px 20px' : '12px 24px',
                                borderRadius: '6px',
                                fontSize: isMobile ? '14px' : '16px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                width: isMobile ? '100%' : 'auto'
                            }}
                        >
                            Retour au tableau de bord
                        </button>
                    </div>
                </div>
            )}

            {/* Bannière */}
            <div style={bannerStyles}>
                <img src="/logo-ngsign.png" alt="NGSign" style={logoStyles} />
                <div style={infoTextStyles}>
                    <strong>{invitation.nomDocument}</strong><br/>
                    <span style={{ color: '#666' }}>ID: {token.substring(0, 8)}...</span>
                    {invitation.dateExpiration && (
                        <div style={{ color: new Date(invitation.dateExpiration) < new Date() ? '#dc3545' : '#ffc107', fontSize: isMobile ? '8px' : '10px', marginTop: '2px' }}>
                            ⏰ Expire le: {new Date(invitation.dateExpiration).toLocaleString()}
                        </div>
                    )}
                    <div style={{ color: '#2e7d32', fontSize: isMobile ? '9px' : '11px', marginTop: '4px' }}>
                        🔐 Signature PKI (Certificat numérique)
                    </div>
                </div>
            </div>

            {/* Affichage vérification certificat expéditeur */}
            {certificatExpediteurValide !== null && (
                <div style={alertBannerStyles}>
                    {certificatExpediteurValide 
                        ? `✅ Certificat de l'expéditeur vérifié - ${verificationExpediteur?.sujet || ''}`
                        : `❌ Certificat de l'expéditeur invalide - ${verificationExpediteur?.message || 'Vérification échouée'}`
                    }
                </div>
            )}

            <div style={mainContainerStyles}>
                
                {/* Visualisation PDF */}
                <div 
                    style={pdfContainerStyles}
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

                {/* Panneau de signature PKI */}
                <div style={signaturePanelStyles}>
                    
                    <h3 style={titleStyles}>🔐 Signature PKI</h3>
                    
                    <div style={{ 
                        backgroundColor: '#e8f5e9', 
                        padding: isMobile ? '8px' : '10px', 
                        borderRadius: '8px', 
                        marginBottom: '15px', 
                        fontSize: isMobile ? '11px' : '13px', 
                        color: '#2e7d32' 
                    }}>
                        ⚠️ Cette signature utilise votre certificat numérique. Assurez-vous d'avoir votre clé privée disponible.
                        <br/><br/>
                        <strong>Processus :</strong>
                        <ol style={{ margin: '5px 0 0 20px', fontSize: isMobile ? '10px' : '12px' }}>
                            <li>Sélectionnez l'emplacement de la signature sur le document</li>
                            <li>Recevez un code OTP par email</li>
                            <li>Saisissez le code pour valider l'utilisation de votre certificat</li>
                            <li>Le document sera signé numériquement avec votre clé privée</li>
                        </ol>
                    </div>
                    
                    <div style={{ border: '1px solid #eee', padding: isMobile ? '10px' : '15px', borderRadius: '8px', marginBottom: '20px' }}>
                        <label style={{ display: 'flex', cursor: 'pointer', gap: '10px', fontSize: isMobile ? '12px' : '14px' }}>
                            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                            Je reconnais avoir lu le document et j'accepte les termes de signature électronique
                        </label>
                    </div>

                    {accepted && (
                        <div>
                            
                            <button 
                                onClick={() => setShowPositionSelector(true)} 
                                style={{ 
                                    ...primaryBtnStyle(isMobile), 
                                    backgroundColor: selectedPosition ? '#28a745' : '#2e7d32',
                                    color: 'white',
                                    marginBottom: '10px',
                                    fontSize: isMobile ? '12px' : '14px',
                                    padding: isMobile ? '10px' : '12px'
                                }}
                            >
                                {selectedPosition ? `✅ Emplacement sélectionné (Page ${selectedPosition.pageNumber})` : "📍 Cliquez ici pour choisir l'emplacement"}
                            </button>
                            
                            {showPositionSelector && (
                                <div style={{ backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px', marginBottom: '15px', fontSize: isMobile ? '10px' : '12px', textAlign: 'center', color: '#856404' }}>
                                    🔍 Mode sélection - Naviguez vers la page souhaitée et cliquez DIRECTEMENT sur le document PDF
                                </div>
                            )}
                            
                            {selectedPosition && (
                                <div style={{ backgroundColor: '#d4edda', padding: '8px', borderRadius: '4px', marginBottom: '15px', fontSize: isMobile ? '10px' : '12px', textAlign: 'center', color: '#155724' }}>
                                    ✓ Signature placée sur la page {selectedPosition.pageNumber} à X:{Math.round(selectedPosition.x)}px Y:{Math.round(selectedPosition.y)}px
                                </div>
                            )}

                            {/* Partie OTP */}
                            <div style={{ marginTop: '25px' }}>
                                {!isOtpSent ? (
                                    <button onClick={handleSendOtp} style={primaryBtnStyle(isMobile)} disabled={loading}>
                                        {loading ? "Envoi en cours..." : "📧 Recevoir le code par Email"}
                                    </button>
                                ) : (
                                    <>
                                        <p style={{ fontSize: isMobile ? '10px' : '12px', textAlign: 'center', color: '#666' }}>
                                            Entrez le code reçu à l'adresse {invitation.emailDestinataire}
                                        </p>
                                        <input 
                                            type="text" 
                                            placeholder="123456" 
                                            value={otp} 
                                            onChange={(e) => setOtp(e.target.value)}
                                            style={otpInputStyle(isMobile)}
                                            autoFocus
                                        />
                                        <button onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: '#007bff', fontSize: isMobile ? '10px' : '12px', width: '100%', cursor: 'pointer', marginBottom: '15px' }}>
                                            Renvoyer le code
                                        </button>
                                        
                                        <div style={{ backgroundColor: '#f8f9fa', padding: isMobile ? '8px' : '10px', borderRadius: '4px', marginBottom: '15px', fontSize: isMobile ? '9px' : '11px' }}>
                                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Prérequis avant signature :</p>
                                            <ul style={{ margin: 0, paddingLeft: isMobile ? '15px' : '20px' }}>
                                                <li style={{ color: accepted ? '#28a745' : '#dc3545' }}>✓ Acceptation des termes</li>
                                                <li style={{ color: selectedPosition ? '#28a745' : '#dc3545' }}>✓ Emplacement de signature choisi</li>
                                                <li style={{ color: isOtpSent ? '#28a745' : '#dc3545' }}>✓ Code OTP reçu</li>
                                                <li style={{ color: otp.length >= 4 ? '#28a745' : '#dc3545' }}>✓ Code OTP saisi ({otp.length}/4)</li>
                                                <li style={{ color: '#2e7d32' }}>✓ Signature avec certificat numérique (PKI)</li>
                                            </ul>
                                        </div>
                                        
                                        <button 
                                            onClick={handlePkiSign} 
                                            disabled={isSignButtonDisabled} 
                                            style={{ 
                                                ...primaryBtnStyle(isMobile), 
                                                backgroundColor: '#2e7d32', 
                                                color: 'white', 
                                                fontSize: isMobile ? '14px' : '16px', 
                                                padding: isMobile ? '12px' : '15px' 
                                            }}
                                        >
                                            {loading ? "Signature en cours..." : "🔐 SIGNER AVEC MON CERTIFICAT PKI"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: isMobile ? '9px' : '11px', color: '#28a745', paddingTop: '20px' }}>
                        🛡️ Conformité ISO 27005 - Sécurisé par TrustSign
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .rpv-core__viewer { cursor: ${showPositionSelector ? 'crosshair' : 'default'}; }
                .rpv-core__page-layer canvas { cursor: ${showPositionSelector ? 'crosshair' : 'default'}; }
                
                /* Responsive PDF viewer */
                @media (max-width: 768px) {
                    .rpv-core__viewer {
                        zoom: 0.8;
                    }
                }
                
                @media (max-width: 480px) {
                    .rpv-core__viewer {
                        zoom: 0.6;
                    }
                }
            `}</style>
        </div>
    );
};

const primaryBtnStyle = (isMobile) => ({
    width: '100%',
    padding: isMobile ? '10px' : '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
});

const otpInputStyle = (isMobile) => ({
    width: '100%',
    padding: isMobile ? '10px' : '12px',
    fontSize: isMobile ? '16px' : '20px',
    textAlign: 'center',
    letterSpacing: isMobile ? '3px' : '6px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginBottom: '10px'
});

export default SignaturePkiPage;