import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomeTransition.css';

const WelcomeTransition = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Navigate to PDF page after animations complete
    const timer = setTimeout(() => {
      navigate('/pdf');
    }, 3500); // Extended time for smoother experience
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="welcome-container">
      <div className="welcome-intro">
        <h2 className="welcome-heading">Welcome</h2>
      </div>
      <main className="welcome-main">
        <div className="welcome-content">
          
        </div>
      </main>
    </div>
  );
};

export default WelcomeTransition;
