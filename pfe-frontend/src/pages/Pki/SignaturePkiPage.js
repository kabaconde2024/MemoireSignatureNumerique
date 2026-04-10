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
    
    // ✅ TOUS les useState en premier, avant tout return conditionnel
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
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const pdfBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(blob);
            });

            const payload = {
                token: token,
                pdfBase64: pdfBase64,
                otp: otp,
                x: selectedPosition.x,
                y: selectedPosition.y,
                pageNumber: selectedPosition.pageNumber,
                displayWidth: selectedPosition.containerWidth,
                displayHeight: selectedPosition.containerHeight
            };

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

    // ✅ Vérifications avant affichage (après tous les hooks)
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
                        <h2 style={{ color: '#28a745', marginBottom: '10px' }}>Signature PKI réussie !</h2>
                        <p style={{ marginBottom: '15px', color: '#666' }}>
                            Le document <strong>{downloadedFileName}</strong> a été signé avec votre certificat numérique.
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
                            Retour au tableau de bord
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
                    <div style={{ color: '#2e7d32', fontSize: '11px', marginTop: '4px' }}>
                        🔐 Signature PKI (Certificat numérique)
                    </div>
                </div>
            </div>

            {/* Affichage vérification certificat expéditeur */}
            {certificatExpediteurValide !== null && (
                <div style={{ 
                    backgroundColor: certificatExpediteurValide ? '#d4edda' : '#f8d7da', 
                    color: certificatExpediteurValide ? '#155724' : '#721c24',
                    padding: '8px 15px', 
                    margin: '10px 40px 0 40px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    textAlign: 'center'
                }}>
                    {certificatExpediteurValide 
                        ? `✅ Certificat de l'expéditeur vérifié - ${verificationExpediteur?.sujet || ''}`
                        : `❌ Certificat de l'expéditeur invalide - ${verificationExpediteur?.message || 'Vérification échouée'}`
                    }
                </div>
            )}

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* Visualisation PDF */}
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

                {/* Panneau de signature PKI */}
                <div style={{ flex: 1, backgroundColor: 'white', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column', padding: '25px', overflowY: 'auto' }}>
                    
                    <h3 style={{ color: '#2e7d32' }}>🔐 Signature PKI</h3>
                    
                    <div style={{ backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', color: '#2e7d32' }}>
                        ⚠️ Cette signature utilise votre certificat numérique. Assurez-vous d'avoir votre clé privée disponible.
                        <br/><br/>
                        <strong>Processus :</strong>
                        <ol style={{ margin: '5px 0 0 20px', fontSize: '12px' }}>
                            <li>Sélectionnez l'emplacement de la signature sur le document</li>
                            <li>Recevez un code OTP par SMS</li>
                            <li>Saisissez le code pour valider l'utilisation de votre certificat</li>
                            <li>Le document sera signé numériquement avec votre clé privée</li>
                        </ol>
                    </div>
                    
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
                                    backgroundColor: selectedPosition ? '#28a745' : '#2e7d32',
                                    color: 'white',
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

                            {/* Partie OTP */}
                            <div style={{ marginTop: '25px' }}>
                                {!isOtpSent ? (
                                    <button onClick={handleSendOtp} style={primaryBtnStyle} disabled={loading}>
                                        {loading ? "Envoi en cours..." : "📧 Recevoir le code par Email"}
                                    </button>
                                ) : (
                                    <>
                                        <p style={{ fontSize: '12px', textAlign: 'center', color: '#666' }}>
                                           Entrez le code reçu à l'adresse {invitation.emailDestinataire}
                                        </p>
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
                                                <li style={{ color: '#2e7d32' }}>✓ Signature avec certificat numérique (PKI)</li>
                                            </ul>
                                        </div>
                                        
                                        <button onClick={handlePkiSign} disabled={isSignButtonDisabled} style={{ ...primaryBtnStyle, backgroundColor: '#2e7d32', color: 'white', fontSize: '16px', padding: '15px' }}>
                                            {loading ? "Signature en cours..." : "🔐 SIGNER AVEC MON CERTIFICAT PKI"}
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
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .rpv-core__viewer { cursor: ${showPositionSelector ? 'crosshair' : 'default'}; }
                .rpv-core__page-layer canvas { cursor: ${showPositionSelector ? 'crosshair' : 'default'}; }
            `}</style>
        </div>
    );
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

export default SignaturePkiPage;