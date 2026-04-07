
import { Box, Typography, Button, Stack, IconButton } from '@mui/material';
import { Description, Close, ArrowForward } from '@mui/icons-material';

const SignaturesView = ({ 
    getRootProps, 
    getInputProps, 
    isDragActive, 
    open, 
    uploadedFiles, 
    removeFile, 
    nextStep 
}) => {
    return (
        <Box sx={{ bgcolor: '#fff', borderRadius: '8px', minHeight: '80vh', p: 4, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" align="center" fontWeight="700" sx={{ color: '#2c3e50', mb: 5 }}>
                Nouvelle transaction
            </Typography>

            <Box 
                {...getRootProps({
                    onClick: (e) => { e.stopPropagation(); open(); }
                })} 
                sx={{ 
                    border: '2px dashed #ffc107', 
                    borderRadius: '8px', 
                    p: 6, 
                    textAlign: 'center',
                    bgcolor: isDragActive ? '#fffdf0' : '#fafafa',
                    cursor: 'pointer',
                    mx: 'auto',
                    width: '100%',
                    maxWidth: '1000px',
                    minHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: '#fffcf0', borderColor: '#0b1e39' }
                }}
            >
                <input {...getInputProps()} />
                <Box sx={{ mb: 2 }}>
                    <Description sx={{ fontSize: 80, color: '#95a5a6' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: '600', color: '#34495e' }}>
                    Cliquez ici pour sélectionner vos documents <span style={{ color: '#f1c40f' }}>PDF</span>
                </Typography>
                <Typography variant="body2" sx={{ color: '#95a5a6', mt: 1 }}>
                    Vous pouvez ajouter plusieurs documents
                </Typography>
            </Box>

            <Box sx={{ mt: 4, mx: 'auto', width: '100%', maxWidth: '1000px' }}>
                {uploadedFiles.length > 0 ? (
                    <Box sx={{ p: 3, bgcolor: '#ffffff', borderRadius: '12px', border: '2px solid #E2E8F0', boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#0b1e39' }}>
                            Document(s) sélectionnés ({uploadedFiles.length}) :
                        </Typography>
                        <Stack spacing={1} sx={{ mb: 3 }}>
                            {uploadedFiles.map((file, index) => (
                                <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Description sx={{ color: '#e74c3c' }} />
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{file.name}</Typography>
                                            <Typography variant="caption" color="textSecondary">{(file.size / 1024).toFixed(2)} Ko</Typography>
                                        </Box>
                                    </Stack>
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeFile(index); }}>
                                        <Close fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                        </Stack>
                        <Button 
                            variant="contained" 
                            fullWidth 
                            onClick={nextStep} 
                            sx={{ py: 1.5, bgcolor: '#ffc107', color: '#0b1e39', fontWeight: 'bold', '&:hover': { bgcolor: '#e6af06' } }}
                            endIcon={<ArrowForward />}
                        >
                            Suivant
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" sx={{ color: '#95a5a6' }}>
                            Plusieurs documents peuvent être <b>signés</b> dans une même transaction
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default SignaturesView;