import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './already.css';

export default function Already() {
    const navigate = useNavigate();
    
    useEffect(() => {
        // Navigate to PDF page after animations complete
        const timer = setTimeout(() => {
            navigate('/pdf');
        }, 3000); // Standard 3 second redirect
        
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="already-container">
            <div className="already-intro">
                <h2 className="already-heading">Already Logged In</h2>
                <h4 className="already-heading">Redirecting to Dashboard...</h4>
            </div>
            <main className="already-main">
                <div className="already-content">
                    {/* Animation content */}
                </div>
            </main>
            
            {/* Pixel canvas for visual effect */}
            <pixel-canvas
                className="already-pixel-canvas"
                data-gap="35"
                data-speed="30"
                data-colors="#e0f2fe, #7dd3fc, #0ea5e9"
            />
        </div>
    );
}