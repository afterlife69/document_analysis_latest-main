import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Container, Typography, Paper, AppBar, Toolbar, Button,
  IconButton, Chip, Divider, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, CircularProgress, Alert, Tab, Tabs,
  TextField, InputAdornment, CardMedia, CardActionArea, CardActions
} from '@mui/material';
import {
  ArrowBack, Home as HomeIcon, EmojiEvents as TrophyIcon, School as SchoolIcon,
  Assignment as AssignmentIcon, CloudUpload as UploadIcon, Search as SearchIcon,
  FilterList as FilterIcon, SortByAlpha as SortIcon, Logout as LogoutIcon,
  Whatshot as PopularIcon, Star as StarIcon, StarBorder as StarBorderIcon,
  Error as ErrorIcon, Description as DocumentIcon, Visibility as ViewIcon, Download as DownloadIcon
} from '@mui/icons-material';

const SubjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'occurrenceCount',
    direction: 'desc'
  });
  const [pdfUrls, setPdfUrls] = useState({});

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        setLoading(true);
        // First try to get from API endpoint
        try {
          const res = await axios.get(`http://localhost:8080/api/subjects/${id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'user-email': localStorage.getItem('email')
            }
          });
          
          if (res.data && res.data.subject) {
            setSubject(res.data.subject);
          } else {
            // Fetch all subjects and find the right one
            const allSubjectsRes = await axios.get('http://localhost:8080/api/subjects', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'user-email': localStorage.getItem('email')
              }
            });
            
            if (allSubjectsRes.data.subjects) {
              const foundSubject = allSubjectsRes.data.subjects.find(s => s._id === id);
              if (foundSubject) {
                setSubject(foundSubject);
              } else {
                throw new Error('Subject not found');
              }
            }
          }
        } catch (apiError) {
          // Fall back to using the JSON data if API fails
          const allSubjectsRes = await axios.get('http://localhost:8080/api/subjects', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'user-email': localStorage.getItem('email')
            }
          });
          
          if (allSubjectsRes.data.subjects) {
            const foundSubject = allSubjectsRes.data.subjects.find(s => s._id === id);
            if (foundSubject) {
              setSubject(foundSubject);
            } else {
              throw new Error('Subject not found');
            }
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch subject details:', err);
        setError('Failed to load subject details. Please try again later.');
        setLoading(false);
      }
    };

    fetchSubject();
  }, [id]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
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
  
  // Filter and sort questions
  const getFilteredAndSortedQuestions = () => {
    if (!subject || !subject.questions) return [];
    
    let filteredQuestions = [...subject.questions];
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredQuestions = filteredQuestions.filter(q => 
        q.content && q.content.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Apply sorting
    filteredQuestions.sort((a, b) => {
      if (sortConfig.key === 'content') {
        return sortConfig.direction === 'asc' 
          ? (a.content || '').localeCompare(b.content || '')
          : (b.content || '').localeCompare(a.content || '');
      } else if (sortConfig.key === 'questionNumber') {
        return sortConfig.direction === 'asc' 
          ? (a.questionNumber || 0) - (b.questionNumber || 0)
          : (b.questionNumber || 0) - (a.questionNumber || 0);
      } else if (sortConfig.key === 'marks') {
        return sortConfig.direction === 'asc' 
          ? (a.marks || 0) - (b.marks || 0)
          : (b.marks || 0) - (a.marks || 0);
      } else {
        // Default: sort by occurrenceCount
        return sortConfig.direction === 'asc' 
          ? (a.occurrenceCount || 0) - (b.occurrenceCount || 0)
          : (b.occurrenceCount || 0) - (a.occurrenceCount || 0);
      }
    });
    
    return filteredQuestions;
  };

  const filteredSortedQuestions = getFilteredAndSortedQuestions();
  const currentQuestions = filteredSortedQuestions.slice(
    page * rowsPerPage, 
    page * rowsPerPage + rowsPerPage
  );

  const getSubjectStats = () => {
    if (!subject || !subject.questions) return { total: 0, avgMarks: 0, avgOccurrence: 0, frequentQuestions: 0 };
    
    const questionCount = subject.questions.length;
    const totalMarks = subject.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const totalOccurrences = subject.questions.reduce((sum, q) => sum + (q.occurrenceCount || 0), 0);
    const frequentQuestions = subject.questions.filter(q => (q.occurrenceCount || 0) > 1).length;
    
    return {
      total: questionCount,
      avgMarks: questionCount ? (totalMarks / questionCount).toFixed(1) : 0,
      avgOccurrence: questionCount ? (totalOccurrences / questionCount).toFixed(1) : 0,
      frequentQuestions
    };
  };

  const stats = getSubjectStats();
  
  // Group questions by occurrence number
  const getQuestionsByOccurrence = () => {
    if (!subject || !subject.questions) return {};
    
    const grouped = {};
    
    subject.questions.forEach(question => {
      const occurrenceCount = question.occurrenceCount || 0;
      if (!grouped[occurrenceCount]) {
        grouped[occurrenceCount] = [];
      }
      grouped[occurrenceCount].push(question);
    });
    
    return grouped;
  };
  
  const questionsByOccurrence = getQuestionsByOccurrence();
  
  // Get statistics for question numbers
  const getQuestionNumberStats = () => {
    if (!subject || !subject.questions) return [];
    
    const questionNumberMap = {};
    
    subject.questions.forEach(question => {
      if (question.questionNumber) {
        if (!questionNumberMap[question.questionNumber]) {
          questionNumberMap[question.questionNumber] = {
            questionNumber: question.questionNumber,
            count: 0,
            totalMarks: 0,
            questions: []
          };
        }
        questionNumberMap[question.questionNumber].count += 1;
        questionNumberMap[question.questionNumber].totalMarks += (question.marks || 0);
        questionNumberMap[question.questionNumber].questions.push(question);
      }
    });
    
    return Object.values(questionNumberMap).sort((a, b) => a.questionNumber - b.questionNumber);
  };
  
  const questionNumberStats = getQuestionNumberStats();

  // Add a function to get the actual PDF URL from the backend
  const getActualPdfUrl = async (s3Key) => {
    try {
      if (pdfUrls[s3Key]) {
        return pdfUrls[s3Key]; // Return cached URL if we've already fetched it
      }
      
      const response = await axios.get(`http://localhost:8080/api/documents/url`, {
        params: { key: s3Key },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'user-email': localStorage.getItem('email')
        }
      });
      
      if (response.data && response.data.url) {
        // Cache the URL for future use
        setPdfUrls(prev => ({
          ...prev,
          [s3Key]: response.data.url
        }));
        return response.data.url;
      }
      
      throw new Error('Failed to get document URL');
    } catch (err) {
      console.error('Error fetching PDF URL:', err);
      return null;
    }
  };

  // Function to open the PDF viewer with a given S3 key
  const openPdfViewer = async (pdf) => {
    const s3Key = pdf.url;
    const actualUrl = await getActualPdfUrl(s3Key);
    
    if (actualUrl) {
      navigate(`/viewpdf?url=${encodeURIComponent(actualUrl)}&key=${encodeURIComponent(s3Key)}&title=${encodeURIComponent(pdf.title || '')}`);
    } else {
      // Handle error - maybe show a snackbar notification
      console.error('Failed to get actual URL for PDF');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212' }}>
        <CircularProgress color="primary" size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          {error} <Button color="inherit" onClick={() => navigate('/pdf')}>Return Home</Button>
        </Alert>
      </Box>
    );
  }

  if (!subject) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', p: 3 }}>
        <Alert severity="warning" sx={{ maxWidth: 600 }}>
          Subject not found. <Button color="inherit" onClick={() => navigate('/pdf')}>Return Home</Button>
        </Alert>
      </Box>
    );
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', backgroundColor: '#121212', color: '#e0e0e0' }}>
      <AppBar position="fixed" color="primary" sx={{ boxShadow: 2, backgroundColor: "#121212" }}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="back"
            onClick={() => navigate('/pdf')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Subject Details
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              startIcon={<HomeIcon />}
              onClick={() => navigateTo('/pdf')}
              sx={{ textTransform: 'none' }}
            >
              Home
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
        {/* Subject Header */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
            color: '#e0e0e0',
            mb: 3
          }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <SchoolIcon sx={{ fontSize: 40, color: '#90caf9', mr: 2 }} />
            <Typography variant="h4" fontWeight="bold" color="#e0e0e0">
              {subject.name}
            </Typography>
          </Box>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom align="center">
                    Questions
                  </Typography>
                  <Typography variant="h3" align="center" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                    {stats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom align="center">
                    Avg. Marks
                  </Typography>
                  <Typography variant="h3" align="center" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                    {stats.avgMarks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom align="center">
                    Avg. Occurr.
                  </Typography>
                  <Typography variant="h3" align="center" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                    {stats.avgOccurrence}×
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom align="center">
                    Frequent Q's
                  </Typography>
                  <Typography variant="h3" align="center" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                    {stats.frequentQuestions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs for different views */}
        <Paper 
          elevation={3} 
          sx={{ 
            borderRadius: 2,
            backgroundColor: '#1e1e1e',
            color: '#e0e0e0',
            overflow: 'hidden'
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .Mui-selected': { color: '#90caf9' },
              '& .MuiTabs-indicator': { backgroundColor: '#90caf9' }
            }}
          >
            <Tab icon={<AssignmentIcon />} label="All Questions" />
            <Tab icon={<PopularIcon />} label="Frequency Analysis" />
            <Tab icon={<FilterIcon />} label="Question Number Analysis" />
            <Tab icon={<DocumentIcon />} label="PDF Documents" />
          </Tabs>

          {/* All Questions Tab */}
          {tabValue === 0 && (
            <Box sx={{ p: 0 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <TextField
                  placeholder="Search questions..."
                  variant="outlined"
                  fullWidth
                  value={searchTerm}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e0e0e0',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#90caf9',
                      },
                    },
                  }}
                />
              </Box>
              
              <TableContainer sx={{ maxHeight: 550 }}>
                <Table stickyHeader sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#2d2d2d', 
                          color: '#e0e0e0',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleSort('content')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          Question
                          {sortConfig.key === 'content' && (
                            <SortIcon 
                              fontSize="small" 
                              sx={{ 
                                ml: 1,
                                transform: sortConfig.direction === 'asc' ? 'none' : 'rotate(180deg)'
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          backgroundColor: '#2d2d2d', 
                          color: '#e0e0e0',
                          fontWeight: 'bold',
                          width: 120,
                          cursor: 'pointer'
                        }}
                        onClick={() => handleSort('questionNumber')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          Q. No.
                          {sortConfig.key === 'questionNumber' && (
                            <SortIcon 
                              fontSize="small" 
                              sx={{ 
                                ml: 1,
                                transform: sortConfig.direction === 'asc' ? 'none' : 'rotate(180deg)'
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          backgroundColor: '#2d2d2d', 
                          color: '#e0e0e0',
                          fontWeight: 'bold',
                          width: 140,
                          cursor: 'pointer'
                        }}
                        onClick={() => handleSort('occurrenceCount')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          Occurrences
                          {sortConfig.key === 'occurrenceCount' && (
                            <SortIcon 
                              fontSize="small" 
                              sx={{ 
                                ml: 1,
                                transform: sortConfig.direction === 'asc' ? 'none' : 'rotate(180deg)'
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          backgroundColor: '#2d2d2d', 
                          color: '#e0e0e0',
                          fontWeight: 'bold',
                          width: 100,
                          cursor: 'pointer'
                        }}
                        onClick={() => handleSort('marks')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          Marks
                          {sortConfig.key === 'marks' && (
                            <SortIcon 
                              fontSize="small" 
                              sx={{ 
                                ml: 1,
                                transform: sortConfig.direction === 'asc' ? 'none' : 'rotate(180deg)'
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          backgroundColor: '#2d2d2d', 
                          color: '#e0e0e0',
                          fontWeight: 'bold',
                          width: 120
                        }}
                      >
                        Difficulty
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentQuestions.map((question) => (
                      <TableRow key={question._id}>
                        <TableCell sx={{ color: '#e0e0e0' }}>
                          {question.content}
                        </TableCell>
                        <TableCell align="center" sx={{ color: '#e0e0e0' }}>
                          {question.questionNumber || 'N/A'}
                        </TableCell>
                        <TableCell align="center" sx={{ color: '#e0e0e0' }}>
                          <Chip 
                            icon={<PopularIcon />}
                            label={question.occurrenceCount || 1} 
                            color={(question.occurrenceCount || 0) > 1 ? "primary" : "default"}
                            sx={{ color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ color: '#e0e0e0' }}>
                          {question.marks || 0} marks
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={question.difficulty || 'UNKNOWN'} 
                            color={getDifficultyColor(question.difficulty)}
                            size="small"
                            sx={{ color: '#fff' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {currentQuestions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ color: '#e0e0e0', py: 3 }}>
                          {searchTerm ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <ErrorIcon sx={{ color: 'warning.main', fontSize: 40 }} />
                              <Typography>No questions match your search term</Typography>
                            </Box>
                          ) : (
                            <Typography>No questions found for this subject</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredSortedQuestions.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ 
                  backgroundColor: '#2d2d2d', 
                  color: '#e0e0e0',
                  '& .MuiTablePagination-selectIcon': { color: '#e0e0e0' },
                  '& .MuiTablePagination-select': { color: '#e0e0e0' },
                  '& .MuiIconButton-root': { color: '#e0e0e0' }
                }}
              />
            </Box>
          )}

          {/* Frequency Analysis Tab */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#90caf9', mb: 3 }}>
                Question Frequency Analysis
              </Typography>
              
              <Grid container spacing={3}>
                {/* Frequency chart */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#e0e0e0' }}>
                      Occurrence Distribution
                    </Typography>
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 1, pt: 3 }}>
                      {Object.entries(questionsByOccurrence)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([occurrenceCount, questions]) => (
                          <Box 
                            key={occurrenceCount}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              flex: 1,
                            }}
                          >
                            <Typography 
                              variant="body2" 
                              sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}
                            >
                              {questions.length}
                            </Typography>
                            <Box 
                              sx={{
                                width: '80%',
                                backgroundColor: parseInt(occurrenceCount) > 1 ? '#90caf9' : 'rgba(255, 255, 255, 0.2)',
                                height: `${Math.min((questions.length / stats.total) * 250, 250)}px`,
                                minHeight: 20,
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-end',
                              }}
                            />
                            <Typography 
                              variant="body2" 
                              sx={{ color: '#e0e0e0', mt: 1, fontWeight: 'bold' }}
                            >
                              {occurrenceCount}×
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 2, textAlign: 'center' }}
                    >
                      Number of Occurrences
                    </Typography>
                  </Paper>
                </Grid>
                
                {/* High frequency questions */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', height: '100%' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#e0e0e0' }}>
                      Most Frequent Questions
                    </Typography>
                    
                    {Object.entries(questionsByOccurrence)
                      .filter(([occurrenceCount]) => parseInt(occurrenceCount) > 1)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .slice(0, 1) // Take only the highest occurrence group
                      .map(([occurrenceCount, questions]) => (
                        <Box key={occurrenceCount} sx={{ mt: 2 }}>
                          <Chip 
                            label={`${occurrenceCount}× Occurrences`}
                            color="primary"
                            sx={{ mb: 2 }}
                          />
                          {questions.slice(0, 5).map((question) => (
                            <Box 
                              key={question._id} 
                              sx={{ 
                                mb: 2, 
                                p: 2, 
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 1,
                                borderLeft: '4px solid #90caf9'
                              }}
                            >
                              <Typography sx={{ color: '#e0e0e0' }}>{question.content}</Typography>
                              <Box sx={{ display: 'flex', mt: 1, justifyContent: 'space-between' }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                  Q{question.questionNumber} • {question.marks} marks
                                </Typography>
                                <Chip 
                                  label={question.difficulty || 'UNKNOWN'} 
                                  color={getDifficultyColor(question.difficulty)}
                                  size="small"
                                  sx={{ color: '#fff' }}
                                />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      ))}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Question Number Analysis Tab */}
          {tabValue === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#90caf9', mb: 3 }}>
                Question Number Analysis
              </Typography>
              
              <Grid container spacing={3}>
                {questionNumberStats.map((stat) => (
                  <Grid item xs={12} md={6} key={stat.questionNumber}>
                    <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#e0e0e0' }}>
                        Question Number {stat.questionNumber}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                        {stat.count} questions • {stat.totalMarks} total marks
                      </Typography>
                      {stat.questions.map((question) => (
                        <Box 
                          key={question._id} 
                          sx={{ 
                            mb: 2, 
                            p: 2, 
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 1,
                            borderLeft: '4px solid #90caf9'
                          }}
                        >
                          <Typography sx={{ color: '#e0e0e0' }}>{question.content}</Typography>
                          <Box sx={{ display: 'flex', mt: 1, justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {question.marks} marks
                            </Typography>
                            <Chip 
                              label={question.difficulty || 'UNKNOWN'} 
                              color={getDifficultyColor(question.difficulty)}
                              size="small"
                              sx={{ color: '#fff' }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* PDF Documents Tab */}
          {tabValue === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#90caf9', mb: 3 }}>
                PDF Documents
              </Typography>
              
              {subject.pdfs && subject.pdfs.length > 0 ? (
                <Grid container spacing={3}>
                  {subject.pdfs.map((pdf, index) => (
                    <Grid item xs={12} sm={6} md={4} key={pdf._id || `pdf-${index}`}>
                      <Card 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 6px 12px rgba(0,0,0,0.2)'
                          }
                        }}
                      >
                        <CardMedia
                          component="div"
                          sx={{
                            pt: '56.25%', // 16:9 aspect ratio
                            position: 'relative',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <DocumentIcon 
                            sx={{ 
                              position: 'absolute', 
                              top: '50%', 
                              left: '50%', 
                              transform: 'translate(-50%, -50%)',
                              fontSize: 60,
                              color: '#90caf9'
                            }} 
                          />
                        </CardMedia>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography gutterBottom variant="h6" component="h2" color='primary'>
                            {pdf.title || `Document ${index + 1}`}
                          </Typography>
                          
                          {pdf.uploadDate && (
                            <Typography variant="body2" color="text.secondary" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
                              Uploaded: {new Date(pdf.uploadDate).toLocaleDateString()}
                            </Typography>
                          )}
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                          <Button 
                            size="small" 
                            startIcon={<ViewIcon />} 
                            sx={{ color: '#90caf9' }}
                            onClick={() => openPdfViewer(pdf)}
                          >
                            View
                          </Button>
                          <Button 
                            size="small" 
                            startIcon={<DownloadIcon />} 
                            sx={{ color: '#90caf9' }}
                            onClick={async () => {
                              const url = await getActualPdfUrl(pdf.url);
                              if (url) {
                                window.open(url, '_blank');
                              }
                            }}
                          >
                            Download
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    p: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 2
                  }}
                >
                  <DocumentIcon sx={{ fontSize: 60, color: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    No PDF documents found
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', mb: 3 }}>
                    This subject doesn't have any associated PDF documents yet.
                  </Typography>
                  <Button 
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => navigateTo('/pdf')}
                    sx={{ 
                      color: '#90caf9', 
                      borderColor: '#90caf9',
                      '&:hover': {
                        borderColor: '#90caf9',
                        backgroundColor: 'rgba(144, 202, 249, 0.08)'
                      }
                    }}
                  >
                    Upload New Document
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </div>
  );
};

export default SubjectDetail;