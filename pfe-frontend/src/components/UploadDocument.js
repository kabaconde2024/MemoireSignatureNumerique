import React, { useState } from 'react';
import axios from 'axios';

const UploadDocument = () => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState(''); 
    const [uploadInfo, setUploadInfo] = useState(null); 
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setStatus('Veuillez sélectionner un fichier.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setStatus('Téléchargement et hachage en cours...');
            
            const response = await axios.post('http://localhost:8080/api/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setUploadInfo(response.data);
            setStatus('Succès ! Document sécurisé.');
        } catch (error) {
            console.error(error);
            setStatus('Erreur lors de l\'envoi au serveur.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>Étape 1 : Préparation du document</h2>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
                Le document sera haché avec <strong>SHA-256</strong> via Bouncy Castle.
            </p>

            <form onSubmit={handleUpload}>
                <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    style={{ marginBottom: '15px' }}
                />
                <br />
                <button 
                    type="submit" 
                    style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Envoyer pour hachage
                </button>
            </form>

            {status && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{status}</p>}

            {uploadInfo && (
                <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f7ff', border: '1px solid #b3d7ff' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Détails de sécurité :</h4>
                    <p><strong>ID :</strong> {uploadInfo.id}</p>
                    <p><strong>Fichier :</strong> {uploadInfo.nom}</p>
                    <p style={{ wordBreak: 'break-all' }}>
                        <strong>Empreinte (Hash) :</strong> <br/>
                        <code style={{ color: '#d32f2f' }}>{uploadInfo.hash}</code>
                    </p>
                </div>
            )}
        </div>
    );
};

export default UploadDocument;