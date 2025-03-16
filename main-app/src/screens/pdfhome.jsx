import { useState, useRef, useEffect } from 'react';
import { Alert, Collapse, AppBar, Toolbar, Typography, Button, Box, Grid, Card, CardContent, CardActionArea, Snackbar } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Pagination, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { 
  ChevronLeft, 
  ChevronRight, 
  EmojiEvents as TrophyIcon, 
  CloudUpload as UploadIcon, 
  Logout as LogoutIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Add as AddIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import './pixelcanvas';
import "./pdfhome.css";

export default function PdfHome() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [animationDirection, setAnimationDirection] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [warning, setWarning] = useState(''); // Added for upload warnings
    const [snackbar, setSnackbar] = useState({
      open: false,
      message: '',
      severity: 'info'
    });
    const foldersPerPage = 8;
    const navigate = useNavigate();
    const fileInputRef = useRef(null); // Added for file input reference

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                setLoading(true);
                const res = await axios.get('http://localhost:8080/api/subjects', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                });
                
                if (res.data.success && res.data.subjects) {
                    setSubjects(res.data.subjects);
                } else {
                    setError('Failed to load subjects');
                }
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
                setError('Failed to connect to server');
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);
    
    const handleLogout = () => {
        localStorage.removeItem('email');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('token');
        navigate('/signin');
    };

    const navigateTo = (path) => {
        navigate(path);
    };

    const handleAddNewSubject = () => {
      if (!newSubject.trim()) {
        setSnackbar({
          open: true,
          message: 'Subject name cannot be empty',
          severity: 'error'
        });
        return;
      }
  
      // Check for duplicate subject
      if (subjects.some(subject => subject.name === newSubject.trim())) {
        setSnackbar({
          open: true,
          message: 'Subject already exists',
          severity: 'error'
        });
        return;
      }
  
      // Send new subject to backend
      axios.post('http://localhost:8080/api/subjects', { name: newSubject.trim() }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(response => {
        if (response.data && response.data.success) {
          // Add the new subject to our local state
          setSubjects(prevSubjects => [...prevSubjects, response.data.subject || {
            _id: Date.now().toString(),
            name: newSubject.trim(),
            questions: [],
            pdfs: []
          }]);
          
          setNewSubject('');
          setDialogOpen(false);
          setSnackbar({
            open: true,
            message: 'New subject added successfully',
            severity: 'success'
          });
        }
      })
      .catch(error => {
        console.error("Error adding new subject:", error);
        setSnackbar({
          open: true,
          message: 'Failed to add new subject',
          severity: 'error'
        });
      });
    };
    
    const viewSubjectDetails = (subjectId) => {
        navigate(`/subject/${subjectId}`);
    };

    const totalPages = Math.ceil(subjects.length / foldersPerPage);
    const startIndex = (currentPage - 1) * foldersPerPage;
    const currentFolders = subjects.slice(startIndex, startIndex + foldersPerPage);

    const handlePageChange = (event, value) => {
        setAnimationDirection(value > currentPage ? 'slide-left' : 'slide-right');
        setCurrentPage(value);
    };

    const getSubjectStats = (subject) => {
        if (!subject) return { questionCount: 0, pdfCount: 0 };
        
        const questionCount = subject.questions ? subject.questions.length : 0;
        const pdfCount = subject.pdfs ? subject.pdfs.length : 0;
        
        return {
            questionCount,
            pdfCount
        };
    };

    const handleCloseSnackbar = () => {
      setSnackbar(prev => ({ ...prev, open: false }));
    };

    const getRandomColor = (index) => {
        const colors = [
            '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'
        ];
        return colors[index % colors.length];
    };

    const FolderCard = ({ subject, index }) => {
        const { questionCount, pdfCount } = getSubjectStats(subject);
        const color = getRandomColor(index);
        
        return (
            <Card 
                className={`folder-card ${animationDirection}`}
                sx={{ 
                    backgroundColor: '#1e1e1e', 
                    color: '#e0e0e0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <CardActionArea 
                    onClick={() => viewSubjectDetails(subject._id)}
                    sx={{ height: '100%' }}
                >
                    <Box 
                        className="folder-icon-container" 
                        sx={{ 
                            display: 'flex', 
                            justifyContent: 'center',
                            pt: 4, pb: 2,
                            position: 'relative'
                        }}
                    >
                        <FolderIcon 
                            sx={{ 
                                fontSize: 80, 
                                color: color,
                                transition: 'transform 0.3s ease, opacity 0.3s ease',
                                zIndex: 1
                            }} 
                            className="folder-icon"
                        />
                        <FolderOpenIcon 
                            sx={{ 
                                fontSize: 80, 
                                color: color,
                                position: 'absolute',
                                opacity: 0,
                                transition: 'transform 0.3s ease, opacity 0.3s ease'
                            }} 
                            className="folder-open-icon"
                        />
                    </Box>
                    <CardContent sx={{ flexGrow: 1, width: '100%' }}>
                        <Typography 
                            variant="h6" 
                            component="div" 
                            align="center" 
                            sx={{ 
                                fontWeight: 'bold',
                                mb: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {subject.name}
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Box 
                                    sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        p: 1,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                        Questions
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: color, fontWeight: 'bold' }}>
                                        {questionCount}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6}>
                                <Box 
                                    sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        p: 1,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                        PDFs
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: color, fontWeight: 'bold' }}>
                                        {pdfCount}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </CardActionArea>
            </Card>
        );
    };

    const NewFolderCard = () => (
        <Card 
            className="folder-card new-folder-card"
            onClick={() => setDialogOpen(true)}
            sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                color: '#e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                cursor: 'pointer'
            }}
        >
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <AddIcon sx={{ fontSize: 60, color: '#90caf9', mb: 2 }} />
                <Typography variant="h6" component="div" sx={{ color: '#90caf9' }}>
                    Add New Subject
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                    Create a new subject folder
                </Typography>
            </Box>
        </Card>
    );

    // Added file upload handler from old version
    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (files.length === 0) return;

        // Check if all files are of allowed types
        const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            setWarning('Please upload only PDF or Word documents');
            setTimeout(() => setWarning(''), 3000);
            return;
        }

        setWarning('');

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('document', file);
                
                await axios.post('http://localhost:8080/api/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'user-email': localStorage.getItem('email')
                    }
                }).then((res) => {
                    localStorage.setItem('sessionId', res.data.sessionId);
                });
            }
            navigate('/uploadquestions');
        } catch (error) {
            setWarning('Failed to upload one or more files. Please try again.');
            console.error('Upload error:', error);
        }
    };

    return (
        <div className='folders-body'>
            <AppBar position="fixed" color="primary" sx={{ boxShadow: 2, backgroundColor: "#121212" }}>
                <Toolbar>
                    <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
                        <SchoolIcon sx={{ mr: 2 }} />
                        <Typography variant="h6" component="div">
                            Subject Library
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            color="inherit" 
                            startIcon={<UploadIcon />}
                            onClick={() => navigateTo('/uploadQP')}
                            sx={{ textTransform: 'none' }}
                        >
                            Upload Papers
                        </Button>

                        <Button 
                            color="inherit" 
                            startIcon={<LogoutIcon />}
                            onClick={handleLogout}
                            sx={{ textTransform: 'none' }}
                        >
                            Logout
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
            
            {/* Warning alert for file uploads */}
            {warning && (
                <Collapse in={Boolean(warning)}>
                    <Alert 
                        severity="error"
                        sx={{ 
                            position: 'fixed',
                            top: 80,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 9999,
                            backgroundColor: 'rgba(211, 47, 47, 0.9)',
                            color: 'white',
                            '& .MuiAlert-icon': {
                                color: 'white'
                            }
                        }}
                    >
                        {warning}
                    </Alert>
                </Collapse>
            )}
            
            <main className='folders-main'>
                <Box 
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        maxWidth: 1200,
                        mx: 'auto',
                        px: 2,
                        pb: 4
                    }}
                >
                    
                    {/* Add upload card */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 4, mt: 15}}>
                        <div className="pdf-card" style={{ "--active-color": "rgb(100, 117, 173)", maxWidth: '600px' }}>
                            <pixel-canvas data-gap="15" data-speed="20" data-colors="#e0f2fe, #7dd3fc, #0ea5e9" data-no-focus></pixel-canvas>
                            <svg xmlns="http://www.w3.org/2000/svg" fill='white' viewBox="0 0 640 512"><path d="M522.7 220.8c3.4-8.9 5.3-18.6 5.3-28.8c0-44.2-35.8-80-80-80c-16.5 0-31.7 5-44.4 13.5c-3.7 2.5-8.2 3.3-12.5 2.3s-8-3.8-10.2-7.6C355.9 77 309.3 48 256 48c-79.5 0-144 64.5-144 144c0 2.5 .1 4.9 .2 7.3c.4 7.1-4 13.5-10.7 15.9C51.7 232.7 16 280.2 16 336c0 70.7 57.3 128 128 128l368 0c61.9 0 112-50.1 112-112c0-54.2-38.5-99.4-89.6-109.8c-4.6-.9-8.6-3.9-10.9-8s-2.6-9.1-.9-13.4zM256 32c53.6 0 101 26.3 130 66.7c3.1 4.3 6 8.8 8.7 13.4c3.5-2.4 7.2-4.5 11-6.4C418.5 99.5 432.8 96 448 96c53 0 96 43 96 96c0 6.6-.7 13-1.9 19.2c-1.1 5.3-2.6 10.5-4.5 15.4c5.3 1.1 10.5 2.5 15.5 4.2C603.6 247.9 640 295.7 640 352c0 70.7-57.3 128-128 128l-368 0C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160zM226.3 274.3l88-88c3.1-3.1 8.2-3.1 11.3 0l88 88c3.1 3.1 3.1 8.2 0 11.3s-8.2 3.1-11.3 0L328 211.3 328 408c0 4.4-3.6 8-8 8s-8-3.6-8-8l0-196.7-74.3 74.3c-3.1 3.1-8.2 3.1-11.3 0s-3.1-8.2 0-11.3z"/></svg>
                            <input 
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".pdf,.doc,.docx"
                                className="file-input"
                                style={{ display: 'none'}}
                                multiple
                            />
                            <button className="upload-button" onClick={() => fileInputRef.current.click()}></button>
                            <h3 className='pdf-title'>Upload</h3>
                        </div>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 5 }}>
                            <div className="folder-spinner"></div>
                        </Box>
                    ) : (
                        <>
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <NewFolderCard />
                                </Grid>
                                
                                {currentFolders.map((subject, index) => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={subject._id}>
                                        <FolderCard 
                                            subject={subject} 
                                            index={startIndex + index} 
                                        />
                                    </Grid>
                                ))}
                                
                                {subjects.length === 0 && !loading && (
                                    <Grid item xs={12}>
                                        <Box 
                                            sx={{ 
                                                display: 'flex', 
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                p: 4,
                                                borderRadius: 2,
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                mt: 2
                                            }}
                                        >
                                            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                                                No subjects found
                                            </Typography>
                                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                                                Click "Add New Subject" to create your first subject folder
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>

                            {totalPages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    <Pagination 
                                        count={totalPages}
                                        page={currentPage}
                                        onChange={handlePageChange}
                                        color="primary"
                                        size="large"
                                        sx={{
                                            '& .MuiPaginationItem-root': {
                                                color: '#e0e0e0'
                                            }
                                        }}
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </main>

            {/* Add Subject Dialog */}
            <Dialog 
                open={dialogOpen} 
                onClose={() => setDialogOpen(false)}
                PaperProps={{
                    style: {
                        backgroundColor: '#2d2d2d',
                        color: '#e0e0e0',
                        borderRadius: '8px',
                    }
                }}
            >
                <DialogTitle sx={{ color: '#e0e0e0' }}>Add New Subject</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                        Enter the name of the new subject you want to add:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="subject-name"
                        label="Subject Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: '#e0e0e0',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                            },
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        onClick={() => setDialogOpen(false)} 
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddNewSubject} 
                        variant="contained" 
                        sx={{ bgcolor: '#90caf9', color: '#121212' }}
                    >
                        Add Subject
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
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
}