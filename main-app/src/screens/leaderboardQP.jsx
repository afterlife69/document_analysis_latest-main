import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, Typography, Paper, Box, Grid, 
  CircularProgress, Chip, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination,
  AppBar, Toolbar, Button, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  TextField, Alert, Snackbar
} from '@mui/material';
import { 
  EmojiEvents as TrophyIcon,
  Whatshot as PopularIcon,
  School as SubjectIcon, 
  Event as YearIcon,
  Timer as TermIcon,
  Home as HomeIcon,
  CloudUpload as UploadIcon,
  Logout as LogoutIcon,
  FilterAlt as FilterIcon,
  Add as AddIcon
} from '@mui/icons-material';

const LeaderboardQP = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectsData, setSubjectsData] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load subjects and their questions data
  useEffect(() => {
    const fetchSubjectsData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8080/api/subjects', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.data.subjects) {
          // Extract subject names
          const subjectsList = response.data.subjects.map(subj => subj.name);
          setSubjects(subjectsList);
          
          // Create a map of subject to questions
          const subjectsWithQuestions = {};
          response.data.subjects.forEach(subject => {
            // Filter out non-object entries and ensure questions is an array
            const questions = Array.isArray(subject.questions) 
              ? subject.questions
              : [];
            console.log("Questions for", subject.name, ":", questions);
            subjectsWithQuestions[subject.name] = questions;
          });
          
          setSubjectsData(subjectsWithQuestions);
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to fetch subjects data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchSubjectsData();
  }, []);

  // Update questions when subject selection changes
  useEffect(() => {
    if (selectedSubject && subjectsData[selectedSubject]) {
      setQuestions(subjectsData[selectedSubject]);
    } else {
      setQuestions([]);
    }
    setPage(0);
  }, [selectedSubject, subjectsData]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSubjectChange = (event) => {
    const value = event.target.value;
    
    if (value === 'add_new') {
      setDialogOpen(true);
      return;
    }
    
    setSelectedSubject(value);
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
      setSelectedSubject(newSubject.trim());
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
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
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

  // Get trophy color based on rank
  const getTrophyColor = (index) => {
    if (index === 0) return '#FFD700'; // Gold
    if (index === 1) return '#C0C0C0'; // Silver
    if (index === 2) return '#CD7F32'; // Bronze
    return '#64748B'; // Default slate color
  };
  
  // Get trophy size based on rank
  const getTrophySize = (index) => {
    if (index < 3) return 'large';
    return 'medium';
  };

  // Get background gradient for top 3 rows
  const getRowStyle = (index) => {
    if (index === 0) return { background: 'linear-gradient(90deg, rgba(255,215,0,0.1) 0%, rgba(255,255,255,1) 100%)' };
    if (index === 1) return { background: 'linear-gradient(90deg, rgba(192,192,192,0.1) 0%, rgba(255,255,255,1) 100%)' };
    if (index === 2) return { background: 'linear-gradient(90deg, rgba(205,127,50,0.1) 0%, rgba(255,255,255,1) 100%)' };
    return {};
  };

  // Get chip color based on difficulty
  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'EASY': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HARD': return 'error';
      default: return 'default';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress sx={{ color: '#90caf9' }} />
        </Box>
      );
    }

    if (error) {
      return <Typography color="error" align="center">{error}</Typography>;
    }

    if (!selectedSubject) {
      return (
        <Box textAlign="center" py={5}>
          <Typography variant="h5" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} gutterBottom>
            Please select a subject to view questions
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Use the dropdown menu above to select a subject and view its questions
          </Typography>
        </Box>
      );
    }

    if (questions.length === 0) {
      return (
        <Box textAlign="center" py={5}>
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            No questions found for "{selectedSubject}"
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
            Try selecting a different subject or uploading some question papers.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <TableContainer component={Paper} elevation={2} sx={{ 
          bgcolor: '#1e1e1e', 
          color: '#e0e0e0',
          overflowX: 'auto' // Ensure horizontal scrolling if needed
        }}>
          <Table sx={{ 
            minWidth: 650,
            tableLayout: 'fixed' // This is important for fixed width columns
          }}>
            <TableHead>
              <TableRow sx={{ 
                backgroundColor: '#2d2d2d',
                height: 56 // Fixed header row height
              }}>
                <TableCell align="center" sx={{ 
                  width: '10%', 
                  color: '#e0e0e0', 
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '16px' // Consistent padding
                }}>Rank</TableCell>
                <TableCell sx={{ 
                  width: '40%', 
                  color: '#e0e0e0', 
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '16px'
                }}>Question</TableCell>
                <TableCell align="center" sx={{ 
                  width: '15%', 
                  color: '#e0e0e0', 
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '16px'
                }}>Occurrences</TableCell>
                <TableCell align="center" sx={{ 
                  width: '15%', 
                  color: '#e0e0e0', 
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '16px'
                }}>Marks</TableCell>                   
                <TableCell align="center" sx={{ 
                  width: '20%', 
                  color: '#e0e0e0', 
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '16px'
                }}>Difficulty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((question, index) => {
                  const actualIndex = page * rowsPerPage + index;
                  return (
                    <TableRow 
                      key={question._id || actualIndex}
                      sx={{ 
                        height: 72, // Fixed height for all rows
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }, 
                        ...getDarkRowStyle(actualIndex),
                        '& .MuiTableCell-root': {
                          color: '#e0e0e0',
                          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                          padding: '16px', // Consistent padding
                          height: '100%' // Full height cell
                        }
                      }}
                    >
                      <TableCell align="center">
                        <Box 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center" 
                          flexDirection="column"
                          sx={{ height: '100%' }}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            #{actualIndex + 1}
                          </Typography>
                          {actualIndex < 10 && (
                            <TrophyIcon 
                              sx={{ 
                                color: getTrophyColor(actualIndex),
                                fontSize: getTrophySize(actualIndex) === 'large' ? 36 : 28
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          sx={{ 
                            fontWeight: actualIndex < 3 ? 500 : 400,
                            fontSize: actualIndex < 3 ? '1.05rem' : '1rem',
                            // Limit to 2 lines with ellipsis
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2
                          }}
                        >
                          {question.content && question.content.length > 150 
                            ? `${question.content.substring(0, 150)}...` 
                            : question.content}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          icon={<PopularIcon />} 
                          label={question.occurrenceCount || 1} 
                          color={actualIndex < 3 ? 'primary' : 'default'}
                          variant={actualIndex < 3 ? 'filled' : 'outlined'}
                          sx={{ color: 'white' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {question.marks || "N/A"} marks
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={question.difficulty || "UNKNOWN"} 
                          color={getDifficultyColor(question.difficulty)}
                          size="small"
                          sx={{ color: 'white' }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              
              {/* Add empty rows to maintain consistent height when fewer items */}
              {rowsPerPage > 0 && questions.length > 0 && 
                Array.from({ length: Math.max(0, rowsPerPage - Math.min(rowsPerPage, questions.length - page * rowsPerPage)) }).map((_, index) => (
                  <TableRow
                    key={`empty-${index}`}
                    sx={{
                      height: 72,
                      backgroundColor: '#1e1e1e',
                      '& .MuiTableCell-root': {
                        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                        padding: '16px'
                      }
                    }}
                  >
                    <TableCell colSpan={5} />
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={questions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            color: '#e0e0e0',
            '& .MuiIconButton-root': {
              color: '#90caf9',
            },
            '& .MuiTablePagination-selectIcon': {
              color: '#90caf9',
            }
          }}
        />
      </>
    );
  };

  // Add this new function for dark mode row styles
  const getDarkRowStyle = (index) => {
    if (index === 0) return { background: 'linear-gradient(90deg, rgba(255,215,0,0.15) 0%, rgba(30, 30, 30, 1) 100%)' };
    if (index === 1) return { background: 'linear-gradient(90deg, rgba(192,192,192,0.15) 0%, rgba(30, 30, 30, 1) 100%)' };
    if (index === 2) return { background: 'linear-gradient(90deg, rgba(205,127,50,0.15) 0%, rgba(30, 30, 30, 1) 100%)' };
    return {};
  };

  return (
    <div style={{ paddingTop: '64px' }}>
      <AppBar position="fixed" color="primary" sx={{ boxShadow: 2, backgroundColor: "#121212" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Question Rankings
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              startIcon={<HomeIcon />}
              onClick={() => navigateTo('/pdf')}
              sx={{ textTransform: 'none' }}
            >
              Document Uploads
            </Button>
            
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

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            background: 'linear-gradient(135deg,rgb(25, 0, 0) 0%,rgb(0, 0, 0) 100%)'
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap">
            <Box display="flex" alignItems="center">
              <TrophyIcon sx={{ fontSize: 40, color: '#FFD700', mr: 2 }} />
              <Typography variant="h4" fontWeight="bold" color="primary">
                Question Rankings
              </Typography>
            </Box>
            
            <Box width={{ xs: '100%', sm: 'auto' }} mt={{ xs: 2, sm: 0 }}>
              <FormControl 
                sx={{ 
                  minWidth: 240,
                  backgroundColor: 'white',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'primary.light',
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.dark',
                    },
                  },
                }}
                size="small"
              >
                <InputLabel id="subject-filter-label">Select Subject</InputLabel>
                <Select
                  labelId="subject-filter-label"
                  value={selectedSubject}
                  onChange={handleSubjectChange}
                  label="Select Subject"
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject} value={subject}>
                      <Box display="flex" alignItems="center" width="100%">
                        <SubjectIcon sx={{ mr: 1, fontSize: 18, color: 'primary.main' }} />
                        <Typography>{subject}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                  <MenuItem value="add_new" sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', mt: 1, color: '#90caf9' }}>
                    <Box display="flex" alignItems="center" width="100%">
                      <AddIcon sx={{ mr: 1, fontSize: 18 }} />
                      <Typography>Add New Subject</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {selectedSubject && (
            <Typography variant="subtitle1" gutterBottom color="white" mb={3}>
              Most frequently appearing questions in {selectedSubject} papers
            </Typography>
          )}
          
          {renderContent()}
        </Paper>
      </Container>
      
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
};

export default LeaderboardQP;