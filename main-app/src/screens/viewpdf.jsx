import React, { useState, useEffect } from 'react';
import { 
  CircularProgress, 
  IconButton, 
  Paper, 
  Button, 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Container,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  ArrowBack, 
  Home, 
  Logout, 
  CloudUpload, 
  NavigateBefore, 
  NavigateNext,
  Share,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './viewpdf.css';
import 'pdfjs-dist/build/pdf.worker.mjs';

// Fix PDF.js worker configuration - use a more reliable approach
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const ViewPDF = () => {
  const navigate = useNavigate();
  const { search } = window.location;
  const params = new URLSearchParams(search);
  const urlFromParam = decodeURIComponent(params.get('url') || '');
  const s3Key = decodeURIComponent(params.get('key') || '');
  const title = decodeURIComponent(params.get('title') || 'Document');

  
  
  const [url, setUrl] = useState(urlFromParam);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Function to fetch the actual URL from the backend using the S3 key
  const fetchActualUrl = async () => {
    if (!s3Key) return;
    
    try {
      setFetchingUrl(true);
      const response = await axios.get(`http://localhost:8080/api/documents/url`, {
        params: { key: s3Key },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'user-email': localStorage.getItem('email')
        }
      });
      
      if (response.data && response.data.url) {
        setUrl(response.data.url);
      } else {
        setPdfError(true);
        setSnackbar({
          open: true,
          message: 'Failed to fetch document URL',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching PDF URL:', error);
      setPdfError(true);
      setSnackbar({
        open: true,
        message: 'Error fetching document. Please try again.',
        severity: 'error'
      });
    } finally {
      setFetchingUrl(false);
    }
  };
  
  // Fetch the URL on component mount if we have an S3 key
  useEffect(() => {
    // If we don't have a URL but we have an S3 key, fetch the URL
    if (!urlFromParam && s3Key) {
      fetchActualUrl();
    }
  }, [s3Key]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setPdfError(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfError(true);
    setLoading(false);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return numPages ? Math.min(Math.max(1, newPageNumber), numPages) : 1;
    });
  };

  console.log(url);
  
  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.2, 0.5));

  // Modified copyShareLink to use the S3 key in the shared link
  const copyShareLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?key=${encodeURIComponent(s3Key)}&title=${encodeURIComponent(title)}`;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setSnackbar({
          open: true,
          message: 'Link copied to clipboard!',
          severity: 'success'
        });
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: 'Failed to copy link',
          severity: 'error'
        });
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('email');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('token');
    navigate('/signin');
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Function to refresh the URL in case it expires
  const refreshUrl = () => {
    fetchActualUrl();
  };

  const LoadingComponent = () => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      padding: 4,
      height: '300px',
      width: '100%'
    }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress sx={{ color: '#90caf9', mb: 2 }} />
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Loading PDF...
        </Typography>
      </Box>
    </Box>
  );

  // Update the ErrorComponent to include a refresh button
  const ErrorComponent = ({ refreshUrl }) => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 4,
      height: '300px',
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 2
    }}>
      <Typography variant="h6" sx={{ color: 'error.main', mb: 2 }}>
        Failed to load PDF
      </Typography>
      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3, textAlign: 'center' }}>
        The document could not be loaded. It may be expired, corrupted or in an unsupported format.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<Refresh />}
          onClick={refreshUrl}
        >
          Refresh
        </Button>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<ArrowBack />}
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );

  return (
    <div className="view-pdf-container">
      <AppBar position="fixed" color="primary" sx={{ boxShadow: 2, backgroundColor: "#121212" }}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="back"
            onClick={() => navigateTo('/pdf')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title || 'PDF Viewer'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              startIcon={<Home />}
              onClick={() => navigateTo('/pdf')}
              sx={{ textTransform: 'none' }}
            >
              Home
            </Button>
            
            <Button 
              color="inherit" 
              startIcon={<CloudUpload />}
              onClick={() => navigateTo('/uploadQP')}
              sx={{ textTransform: 'none' }}
            >
              Upload Papers
            </Button>

            <Button 
              color="inherit" 
              startIcon={<Logout />}
              onClick={handleLogout}
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box className="pdf-toolbar" sx={{ 
        bgcolor: 'rgba(45, 45, 45, 0.95)', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <Container maxWidth="xl">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 1
          }}>
            {!pdfError && !loading && !fetchingUrl && (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Page {pageNumber} of {numPages}
              </Typography>
            )}
            {(pdfError || loading || fetchingUrl) && (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {fetchingUrl ? 'Fetching document...' : loading ? 'Loading document...' : 'Error loading document'}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Previous Page">
                <span>
                  <IconButton 
                    onClick={previousPage}
                    disabled={loading || pdfError || pageNumber <= 1}
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)'
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.3)'
                      }
                    }}
                  >
                    <NavigateBefore />
                  </IconButton>
                </span>
              </Tooltip>
              
              <Tooltip title="Next Page">
                <span>
                  <IconButton 
                    onClick={nextPage}
                    disabled={loading || pdfError || pageNumber >= numPages}
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)'
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.3)'
                      }
                    }}
                  >
                    <NavigateNext />
                  </IconButton>
                </span>
              </Tooltip>
              
              <Tooltip title="Zoom Out">
                <IconButton 
                  onClick={zoomOut}
                  disabled={loading || pdfError}
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)'
                    },
                    '&.Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  <ZoomOut />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Zoom In">
                <IconButton 
                  onClick={zoomIn}
                  disabled={loading || pdfError}
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.1)', 
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)'
                    },
                    '&.Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  <ZoomIn />
                </IconButton>
              </Tooltip>
              
              {pdfError && (
                <Tooltip title="Refresh Document">
                  <IconButton 
                    onClick={refreshUrl}
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.1)', 
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Share">
                <IconButton 
                  onClick={copyShareLink}
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.1)', 
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  <Share />
                </IconButton>
              </Tooltip>
              
              <Button
                variant="contained"
                startIcon={<Download />}
                component="a"
                href={url}
                download
                target="_blank"
                disabled={!url || fetchingUrl}
                size="small"
                sx={{
                  bgcolor: '#90caf9',
                  color: '#121212',
                  '&:hover': {
                    bgcolor: '#64b5f6'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(144, 202, 249, 0.3)',
                  }
                }}
              >
                Download
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
      
      <Container maxWidth="lg" className="pdf-content">
        {fetchingUrl ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh'
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress sx={{ color: '#90caf9', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Fetching document...
              </Typography>
            </Box>
          </Box>
        ) : (
          <Paper 
            elevation={4}
            sx={{ 
              bgcolor: '#1e1e1e',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              padding: 2,
              mx: 'auto',
              width: 'fit-content',
              maxWidth: '100%',
              mt: 2
            }}
          >
            {url ? (
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<LoadingComponent />}
                error={<ErrorComponent refreshUrl={refreshUrl} />}
              >
                {!pdfError && (
                  <Page 
                    pageNumber={pageNumber} 
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="pdf-page"
                  />
                )}
              </Document>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 4,
                height: '300px',
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 2
              }}>
                <Typography variant="h6" sx={{ color: 'error.main', mb: 2 }}>
                  No document URL provided
                </Typography>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3, textAlign: 'center' }}>
                  There was an error loading the document. Please return to the library and try again.
                </Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  startIcon={<ArrowBack />}
                  onClick={() => navigateTo('/pdf')}
                >
                  Return to Library
                </Button>
              </Box>
            )}
          </Paper>
        )}
        
        {!pdfError && !loading && (
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center', 
            mt: 2,
            mb: 4,
            gap: 2
          }}>
            <Button
              variant="outlined"
              disabled={pageNumber <= 1}
              onClick={previousPage}
              startIcon={<NavigateBefore />}
              sx={{ 
                color: '#90caf9', 
                borderColor: 'rgba(144, 202, 249, 0.5)',
                '&:hover': {
                  borderColor: '#90caf9',
                  backgroundColor: 'rgba(144, 202, 249, 0.08)'
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              Previous
            </Button>
            
            <Button
              variant="outlined"
              disabled={pageNumber >= numPages}
              onClick={nextPage}
              endIcon={<NavigateNext />}
              sx={{ 
                color: '#90caf9', 
                borderColor: 'rgba(144, 202, 249, 0.5)',
                '&:hover': {
                  borderColor: '#90caf9',
                  backgroundColor: 'rgba(144, 202, 249, 0.08)'
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              Next
            </Button>
          </Box>
        )}
      </Container>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ViewPDF;