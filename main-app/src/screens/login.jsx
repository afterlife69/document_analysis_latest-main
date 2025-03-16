import React, { useEffect, useState } from 'react';
import './pixelcanvas';
import axios from 'axios';
import './login.css';
import { Snackbar, Alert, CircularProgress, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import WelcomeTransition from '../components/WelcomeTransition';

export default function Login() {
    const nav = useNavigate();

    const [data, setData] = useState({
      email: '',
      password: ''
    })
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarSeverity, setSnackbarSeverity] = useState('error');
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [showTransition, setShowTransition] = useState(false);
    useEffect(() => {
      if (localStorage.getItem('token')){
        nav('/'); }
      }, []);
    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const res = await axios.post('http://localhost:8080/api/auth/signin', data);
        console.log(res.data);
        localStorage.setItem('email', data.email);
        localStorage.setItem('token', res.data.token);
        setSnackbarOpen(true);
        setSnackbarSeverity('success');
        setSnackbarMessage('Login successful! Redirecting...');
        setLoginSuccess(true);
        
        // Show transition with a longer delay for smoother fade-out
        setTimeout(() => {
          setShowTransition(true);
        }, 500);
      } catch (err) {
        console.log(err);
        setSnackbarOpen(true);
        setSnackbarSeverity('error');
        setSnackbarMessage('Invalid email or password');
        setLoading(false);
      }
    }

    // If showing transition, render the transition component
    if (showTransition) {
      return <WelcomeTransition />;
    }

    return (
      <div className={`login-container ${loginSuccess ? 'fade-out' : ''}`}>
        <div className="login-form" tabIndex={0}>
          <h1 className="form-title">Welcome back!</h1>
          <form>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                onChange={(e) => setData({...data, email: e.target.value})}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                onChange={(e) => setData({...data, password: e.target.value})}
                required
              />
            </div>
            <Button 
              type="submit"
              variant="contained" 
              fullWidth 
              className="login-button"
              onClick={handleSubmit}
              disabled={loading || loginSuccess}
              sx={{
                bgcolor: '#696969', // Grey color
                '&:hover': {
                  bgcolor: '#808080', // Lighter grey on hover
                },
                '&:disabled': {
                  bgcolor: '#555555', // Darker grey when disabled
                }
              }}
            >
              {loading ? (
                <div className="button-loader">
                  <CircularProgress size={24} color="inherit" />
                  <span className="loader-text">Signing in...</span>
                </div>
              ) : loginSuccess ? (
                <div className="button-loader">
                  <CircularProgress size={24} color="inherit" />
                  <span className="loader-text">Redirecting...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="additional-links">
            <Link to="/forgot-pass">Forgot password?</Link>
            <Link to="/signup">Sign up</Link>
          </div>
          
          <pixel-canvas
            data-gap="35"
            data-speed="30"
            data-colors="#e0f2fe, #7dd3fc, #0ea5e9"
          />
          
        </div>
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
    );
}