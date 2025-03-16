import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
  Grid,
  AppBar,
  Toolbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme
} from '@mui/material';
import { 
  CloudUpload, 
  Send, 
  ArrowBack, 
  Home, 
  Logout,
  Description as DocumentIcon
} from '@mui/icons-material';
import Loading from './loading';
import './uploadQP.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

const UploadQuestionPaper = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('No file selected');
  const [paperMetadata, setPaperMetadata] = useState({
    title: '',
    subject: '',
    year: CURRENT_YEAR,
    term: ''
  });
  const [subjects, setSubjects] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const fileInputRef = useRef(null);

  // Load subjects from backend when component mounts
  useEffect(() => {
    axios.get('http://localhost:8080/api/subjects', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => {
      if (response.data.subjects) {
        setSubjects(response.data.subjects.map(subj => subj.name));
        if (response.data.subjects.length > 0) {
          setPaperMetadata(prev => ({
            ...prev,
            subject: response.data.subjects[0].name
          }));
        }
      }
    })
    .catch(error => {
      console.error("Error fetching subjects:", error);
    });
  }, []);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'application/pdf') {
      setSnackbar({
        open: true,
        message: 'Please select a PDF file.',
        severity: 'error'
      });
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setSnackbar({
        open: true,
        message: 'File size exceeds 10MB limit.',
        severity: 'error'
      });
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'subject' && value === 'add_new') {
      setDialogOpen(true);
      return;
    }
    
    setPaperMetadata(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (subjects.includes(newSubject.trim())) {
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
      const updatedSubjects = [...subjects, newSubject.trim()];
      setSubjects(updatedSubjects);
      setPaperMetadata(prev => ({
        ...prev,
        subject: newSubject.trim()
      }));
      setNewSubject('');
      setDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'New subject added successfully',
        severity: 'success'
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!file) {
      setSnackbar({
        open: true,
        message: 'Please select a PDF file.',
        severity: 'error'
      });
      return;
    }
    
    const { title, subject, year, term } = paperMetadata;
    if (!title || !subject || !year || !term) {
      setSnackbar({
        open: true,
        message: 'All fields are required.',
        severity: 'error'
      });
      return;
    }
    
    // Prepare form data - make sure field name matches what the server expects
    const formData = new FormData();
    formData.append('questionPaper', file); // This must match the field name in the route
    formData.append('title', title);
    formData.append('subject', subject); // Changed from 'course' to 'subject'
    formData.append('year', year);
    formData.append('term', term);
    
    console.log('Submitting form data:', file, title, subject, year, term);
    
    setLoading(true);
    
    try {
      const response = await axios.post(
        'http://localhost:8080/api/upload/question-paper', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data', // Important for file uploads
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setSnackbar({
        open: true,
        message: 'Question paper processed successfully!',
        severity: 'success'
      });
      
      // Navigate to a success or details page after short delay
      setTimeout(() => {
        navigate('/pdf');
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading question paper:', error);
      
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to process question paper.',
        severity: 'error'
      });
      
      setLoading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
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

  if (loading) {
    return <Loading />;
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', backgroundColor: '#121212', color: '#e0e0e0' }}>
      <AppBar position="fixed" color="primary" sx={{ boxShadow: 2, backgroundColor: "#121212" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Upload Question Paper
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
              startIcon={<Logout />}
              onClick={handleLogout}
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
            color: '#e0e0e0',
            mb: 3
          }}
        >
          <Box display="flex" alignItems="center" mb={3}>
            <DocumentIcon sx={{ fontSize: 40, color: '#90caf9', mr: 2 }} />
            <Typography variant="h4" fontWeight="bold" color="#e0e0e0">
              Upload Question Paper
            </Typography>
          </Box>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    border: '1px dashed rgba(255, 255, 255, 0.3)',
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 2,
                    textAlign: 'center',
                    mb: 2
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    data-testid="pdf-upload"
                  />
                  
                  {!file ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <CloudUpload sx={{ fontSize: 60, color: '#90caf9' }} />
                      <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Drag & drop your file here or 
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleBrowseClick}
                        sx={{
                          bgcolor: '#90caf9',
                          color: '#121212',
                          '&:hover': {
                            bgcolor: '#64b5f6'
                          },
                        }}
                      >
                        Browse Files
                      </Button>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Supported format: PDF (Max size: 10MB)
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 1,
                          p: 2,
                          width: '100%'
                        }}
                      >
                        <DocumentIcon sx={{ color: '#90caf9', fontSize: 40 }} />
                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                          <Typography noWrap sx={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                            {fileName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          onClick={handleBrowseClick}
                          sx={{ 
                            color: '#90caf9', 
                            borderColor: 'rgba(144, 202, 249, 0.5)',
                            '&:hover': {
                              borderColor: '#90caf9',
                              backgroundColor: 'rgba(144, 202, 249, 0.08)'
                            }
                          }}
                        >
                          Change
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ color: '#90caf9', fontWeight: 'bold', mb: 2 }}>
                  Paper Details
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Paper Title"
                  name="title"
                  value={paperMetadata.title}
                  onChange={handleMetadataChange}
                  variant="outlined"
                  fullWidth
                  required
                  InputProps={{
                    sx: { color: '#e0e0e0' }
                  }}
                  InputLabelProps={{
                    sx: { color: 'rgba(255, 255, 255, 0.7)' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' },
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl 
                  fullWidth 
                  required 
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e0e0e0',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' },
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    },
                    '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.7)' }
                  }}
                >
                  <InputLabel id="subject-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Subject</InputLabel>
                  <Select
                    labelId="subject-label"
                    id="subject"
                    name="subject"
                    value={paperMetadata.subject}
                    onChange={handleMetadataChange}
                    label="Subject"
                  >
                    {subjects.map((subj) => (
                      <MenuItem key={subj} value={subj}>{subj}</MenuItem>
                    ))}
                    <MenuItem value="add_new"><em>+ Add new subject</em></MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl 
                  fullWidth 
                  required 
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e0e0e0',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' },
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    },
                    '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.7)' }
                  }}
                >
                  <InputLabel id="year-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Year</InputLabel>
                  <Select
                    labelId="year-label"
                    id="year"
                    name="year"
                    value={paperMetadata.year}
                    onChange={handleMetadataChange}
                    label="Year"
                  >
                    {YEARS.map(year => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl 
                  fullWidth 
                  required 
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e0e0e0',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' },
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    },
                    '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.7)' }
                  }}
                >
                  <InputLabel id="term-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Term</InputLabel>
                  <Select
                    labelId="term-label"
                    id="term"
                    name="term"
                    value={paperMetadata.term}
                    onChange={handleMetadataChange}
                    label="Term"
                  >
                    <MenuItem value="FALL">Fall</MenuItem>
                    <MenuItem value="SPRING">Spring</MenuItem>
                    <MenuItem value="SUMMER">Summer</MenuItem>
                    <MenuItem value="WINTER">Winter</MenuItem>
                    <MenuItem value="MIDTERM">Midterm</MenuItem>
                    <MenuItem value="FINAL">Final</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  onClick={() => navigateTo('/pdf')}
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  sx={{ 
                    color: '#90caf9', 
                    borderColor: 'rgba(144, 202, 249, 0.5)',
                    '&:hover': {
                      borderColor: '#90caf9',
                      backgroundColor: 'rgba(144, 202, 249, 0.08)'
                    }
                  }}
                >
                  Back to Library
                </Button>
                
                <Button 
                  type="submit" 
                  variant="contained"
                  startIcon={<Send />}
                  disabled={!file || !paperMetadata.title || !paperMetadata.subject || !paperMetadata.term}
                  sx={{
                    bgcolor: '#90caf9',
                    color: '#121212',
                    '&:hover': {
                      bgcolor: '#64b5f6'
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(144, 202, 249, 0.3)'
                    }
                  }}
                >
                  Upload and Process
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
      
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          style: {
            backgroundColor: '#2d2d2d',
            borderRadius: '10px',
            color: '#e0e0e0'
          }
        }}
      >
        <DialogTitle>Add New Subject</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
            Please enter the name of the new subject:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Subject Name"
            type="text"
            fullWidth
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            variant="outlined"
            InputProps={{
              sx: { color: '#e0e0e0' }
            }}
            InputLabelProps={{
              sx: { color: 'rgba(255, 255, 255, 0.7)' }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#90caf9' }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pb: 3 }}>
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
};

export default UploadQuestionPaper;
