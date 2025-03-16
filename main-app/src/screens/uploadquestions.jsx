import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './pixelcanvas';
import "./uploadquestions.css";
import { useNavigate } from 'react-router-dom';
import { 
    Button, Stack, Snackbar, Alert, MenuItem, 
    FormControl, Select, InputLabel, IconButton,
    Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, TextField, Typography
} from '@mui/material';
import Sortable from 'sortablejs';
import { AddCircle, CloudUpload, Close, Send, Edit as EditIcon, ArrowBack } from '@mui/icons-material';

import Loading from './loading';

export default function UploadQuestions() {
    // Initialize with one empty question
    const [questions, setQuestions] = useState([{ id: Date.now(), content: '' }]);
    const [inputValue, setInputValue] = useState('');
    const [contentLength, setContentLength] = useState('medium');
    const [complexity, setComplexity] = useState('simple');
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    
    const fileInputRef = useRef(null);
    const questionsListRef = useRef(null);
    const sortableInstanceRef = useRef(null);
    const nav = useNavigate();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    // A stable callback that always has the latest 'questions'
    const onEnd = useCallback((evt) => {
        if (
            evt.oldIndex == null ||
            evt.newIndex == null ||
            evt.oldIndex < 0 ||
            evt.newIndex < 0 ||
            evt.oldIndex >= questions.length ||
            evt.newIndex >= questions.length
        ) {
            return;
        }
        const newQuestions = [...questions];
        const [movedItem] = newQuestions.splice(evt.oldIndex, 1);
        newQuestions.splice(evt.newIndex, 0, movedItem);
        setQuestions(newQuestions);
    }, [questions]);

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
                if(response.data.subjects.length > 0){
                    setSubject(response.data.subjects[0].name);
                }
            }
        })
        .catch(error => {
            console.error("Error fetching subjects:", error);
        });
    }, []);

    useEffect(() => {
        if (!questionsListRef.current) return;

        // Create Sortable once
        if (!sortableInstanceRef.current) {
            sortableInstanceRef.current = Sortable.create(questionsListRef.current, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd,
            });
        } else {
            // Update 'onEnd' after each render so it has the latest 'questions'
            sortableInstanceRef.current.option('onEnd', onEnd);
        }

        return () => {
            // Clean up on unmount
            if (sortableInstanceRef.current) {
                sortableInstanceRef.current.destroy();
                sortableInstanceRef.current = null;
            }
        };
    }, [onEnd]);

    const handleAddQuestion = () => {
        if (questions.length >= 20) {
            setSnackbarSeverity('warning');
            setSnackbarMessage('Maximum 20 questions allowed.');
            setSnackbarOpen(true);
            return;
        }
        
        // Add a new empty question
        setQuestions([...questions, {
            id: Date.now(),
            content: ''
        }]);
        
        // Set editing mode for the new question
        setTimeout(() => {
            setEditingId(Date.now());
        }, 0);
    };

    const handleFileUpload = () => {
        fileInputRef.current.click();
    };

    const handleDeleteQuestion = (id) => {
        setQuestions((prev) => {
            const newArr = prev.filter((q) => q.id !== id);
            
            // If all questions are deleted, add one empty question
            if (newArr.length === 0) {
                return [{ id: Date.now(), content: '' }];
            }
            
            setSnackbarSeverity('info');
            setSnackbarMessage('Question deleted.');
            setSnackbarOpen(true);
            return newArr;
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result;
            if (typeof text !== 'string') return;
            const lines = text.split('\n').map((ln) => ln.trim()).filter((ln) => ln);
            
            if (lines.length > 20) {
                setSnackbarSeverity('error');
                setSnackbarMessage('File has more than 20 questions.');
                setSnackbarOpen(true);
                return;
            }
            
            if (questions.length + lines.length > 20) {
                setSnackbarSeverity('error');
                setSnackbarMessage('Total questions exceed 20.');
                setSnackbarOpen(true);
                return;
            }
            
            // Check for duplicates
            const currentQuestions = questions.map(q => q.content.toLowerCase());
            const newNonDuplicates = lines.filter(line => 
                !currentQuestions.includes(line.toLowerCase())
            );
            
            if (newNonDuplicates.length < lines.length) {
                setSnackbarSeverity('warning');
                setSnackbarMessage('Some duplicate questions were skipped.');
                setSnackbarOpen(true);
            }
            
            if (newNonDuplicates.length === 0) {
                setSnackbarSeverity('error');
                setSnackbarMessage('All questions in file are duplicates.');
                setSnackbarOpen(true);
                return;
            }
            
            // Remove empty question if it exists
            let existingQuestions = questions;
            if (existingQuestions.length === 1 && existingQuestions[0].content === '') {
                existingQuestions = [];
            }
            
            const newQuestions = newNonDuplicates.map((q) => ({
                id: Date.now() + Math.random(),
                content: q
            }));
            
            setQuestions([...existingQuestions, ...newQuestions]);
            setSnackbarSeverity('success');
            setSnackbarMessage('File uploaded successfully.');
            setSnackbarOpen(true);
        };
        reader.readAsText(file);
        // Clear the input so the same file can be uploaded again
        e.target.value = '';
    };

    const handleContentLengthChange = (event) => {
        setContentLength(event.target.value);
    };

    const handleComplexityChange = (event) => {
        setComplexity(event.target.value);
    };

    const handleSubjectChange = (event) => {
        const value = event.target.value;
        if (value === 'add_new') {
            setDialogOpen(true);
        } else {
            setSubject(value);
        }
    };

    const handleAddNewSubject = () => {
        if (!newSubject.trim()) {
            setSnackbarSeverity('error');
            setSnackbarMessage('Subject name cannot be empty');
            setSnackbarOpen(true);
            return;
        }

        // Check for duplicate subject
        if (subjects.includes(newSubject.trim())) {
            setSnackbarSeverity('error');
            setSnackbarMessage('Subject already exists');
            setSnackbarOpen(true);
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
            setSubject(newSubject.trim());
            setNewSubject('');
            setDialogOpen(false);
            setSnackbarSeverity('success');
            setSnackbarMessage('New subject added successfully');
            setSnackbarOpen(true);
        })
        .catch(error => {
            console.error("Error adding new subject:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to add new subject');
            setSnackbarOpen(true);
        });
    };

    const handleSubmitAll = () => {
        // Filter out empty questions
        const validQuestions = questions.filter(q => q.content.trim());
        
        if (!validQuestions.length) {
            setSnackbarSeverity('warning');
            setSnackbarMessage('No questions to submit.');
            setSnackbarOpen(true);
            return;
        }

        if (!title.trim()) {
            setSnackbarSeverity('warning');
            setSnackbarMessage('Please enter a title for the document.');
            setSnackbarOpen(true);
            return;
        }

        if (!subject) {
            setSnackbarSeverity('warning');
            setSnackbarMessage('Please select a subject.');
            setSnackbarOpen(true);
            return;
        }
        
        setLoading(true);
        axios.post('http://localhost:8080/api/pdf', {
            title: title.trim(),
            subject: subject,
            questions: validQuestions.map((q) => q.content),
            contentLength,
            complexity,
            sessionId: localStorage.getItem('sessionId')
        },{
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then((res) => {
            const url = res.data.url;
            // Navigate to viewpdf page with the PDF URL
            nav(`/viewpdf?url=${encodeURIComponent(url)}`);
        })
        .catch((error) => {
            console.error("Error submitting questions:", error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to generate PDF. Please try again.');
            setSnackbarOpen(true);
            setLoading(false);
        });
    };

    const handleEditStart = (question) => {
        setEditingId(question.id);
        setEditValue(question.content);
    };

    const handleEditSave = (id) => {
        // Check for duplicates
        const duplicateExists = questions.some(q => 
            q.id !== id && 
            q.content.toLowerCase() === editValue.trim().toLowerCase() &&
            editValue.trim() !== ''
        );
        
        if (duplicateExists) {
            setSnackbarSeverity('error');
            setSnackbarMessage('Duplicate question not allowed.');
            setSnackbarOpen(true);
            return;
        }
        
        setQuestions(questions.map(q => 
            q.id === id ? { ...q, content: editValue.trim() } : q
        ));
        setEditingId(null);
        setEditValue('');
    };

    const handleGoBack = () => {
        nav('/pdf');
    };

    return (
        loading ? <Loading /> : (
            <div className="upload-body">
                <div className="upload-main">
                    <div className="content-wrapper">
                        
                        <TextField
                            className="title-input"
                            label="Document Title"
                            variant="outlined"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            fullWidth
                            InputLabelProps={{
                                style: { color: 'rgba(255, 255, 255, 0.7)' }
                            }}
                            placeholder="Enter document title..."
                            required
                        />
                        
                        <div className="form-row">
                            <FormControl className="select-control">
                                <InputLabel id="subject-label">Subject</InputLabel>
                                <Select
                                    labelId="subject-label"
                                    value={subject}
                                    label="Subject"
                                    onChange={handleSubjectChange}
                                >
                                    {subjects.map((subj) => (
                                        <MenuItem key={subj} value={subj}>{subj}</MenuItem>
                                    ))}
                                    <MenuItem value="add_new"><em>+ Add new subject</em></MenuItem>
                                </Select>
                            </FormControl>
                            
                            <FormControl className="select-control">
                                <InputLabel id="content-length-label">Content Length</InputLabel>
                                <Select
                                    labelId="content-length-label"
                                    value={contentLength}
                                    label="Content Length"
                                    onChange={handleContentLengthChange}
                                >
                                    <MenuItem value="short">Short</MenuItem>
                                    <MenuItem value="medium">Medium</MenuItem>
                                    <MenuItem value="long">Long</MenuItem>
                                </Select>
                            </FormControl>
                            
                            <FormControl className="select-control">
                                <InputLabel id="complexity-label">Complexity</InputLabel>
                                <Select
                                    labelId="complexity-label"
                                    value={complexity}
                                    label="Complexity"
                                    onChange={handleComplexityChange}
                                >
                                    <MenuItem value="simple">Simple</MenuItem>
                                    <MenuItem value="technical">Technical</MenuItem>
                                </Select>
                            </FormControl>
                        </div>
                    
                        <div className="controls-container top-controls">
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddCircle />}
                                onClick={handleAddQuestion}
                                className="control-button"
                                style={{ minWidth: '160px', width: 'auto' }}
                            >
                                Add Question
                            </Button>
                            
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<CloudUpload />}
                                onClick={handleFileUpload}
                                className="control-button"
                                style={{ minWidth: '160px', width: 'auto' }}
                            >
                                Upload File
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".txt"
                                onChange={handleFileChange}
                            />
                        </div>
                        <div className="questions-container">
                            <div className="questions-header">
                                <Typography variant="h6">Questions ({questions.length}/20)</Typography>
                            </div>
                            
                            <div ref={questionsListRef} className="questions-list">
                                {questions.map((question) => (
                                    <div key={question.id} className="question-item" data-id={question.id}>
                                        <span className="drag-handle">☰</span>
                                        {editingId === question.id ? (
                                            <input
                                                className="question-content editable"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => handleEditSave(question.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleEditSave(question.id)}
                                                autoFocus
                                            />
                                        ) : (
                                            <div 
                                                className="question-content"
                                                onClick={() => handleEditStart(question)}
                                            >
                                                {question.content || "(Click to edit)"}
                                            </div>
                                        )}
                                        <IconButton 
                                            className="delete-button"
                                            onClick={() => handleDeleteQuestion(question.id)}
                                            size="small"
                                        >
                                            <Close />
                                        </IconButton>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="controls-container bottom-controls">
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBack />}
                                onClick={handleGoBack}
                                className="control-button"
                            >
                                Back
                            </Button>
                            
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Send />}
                                onClick={handleSubmitAll}
                                className="control-button"
                            >
                                Submit
                            </Button>
                        </div>
                    </div>

                    <Dialog 
                        open={dialogOpen} 
                        onClose={() => setDialogOpen(false)}
                        PaperProps={{
                            style: {
                                backgroundColor: '#1a1a1a',
                                borderRadius: '10px',
                            }
                        }}
                    >
                        <DialogTitle className="dialog-title">Add New Subject</DialogTitle>
                        <DialogContent className="dialog-content">
                            <DialogContentText style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                Please enter the name of the new subject
                            </DialogContentText>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Subject Name"
                                type="text"
                                fullWidth
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                InputLabelProps={{
                                    style: { color: 'rgba(255, 255, 255, 0.7)' }
                                }}
                                InputProps={{
                                    style: { color: 'white' }
                                }}
                                variant="standard"
                            />
                        </DialogContent>
                        <DialogActions className="dialog-actions">
                            <Button onClick={() => setDialogOpen(false)} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddNewSubject} variant="contained" color="primary">
                                Add
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Snackbar
                        open={snackbarOpen}
                        autoHideDuration={3000}
                        onClose={() => setSnackbarOpen(false)}
                    >
                        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>
                            {snackbarMessage}
                        </Alert>
                    </Snackbar>
                </div>
            </div>
        )
    );
}