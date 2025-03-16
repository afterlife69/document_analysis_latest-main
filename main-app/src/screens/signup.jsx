import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import './pixelcanvas';
import './signup.css';
import { Link, useNavigate } from 'react-router-dom';

export default function SignUp() {
    const nav = useNavigate()
    const [data, setData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: ''
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        await axios.post('http://localhost:8080/api/auth/signup', data).then((res) => {
            alert('User registered successfully');
            nav('/signin');
        }).catch((err) => {
            alert('Error registering user');
            setData({
                firstName: '',
                lastName: '',
                username: '',
                email: '',
                password: ''
            });
        });
    }

    return (
        <div className="signup-container">
            <div className="signup-form">
                <h1 className="signup-form-title">Welcome, Register Here.</h1>
                <form onSubmit={handleSubmit}>
                <div className="signup-input-group">
                        <label htmlFor="first-name">First Name</label>
                        <input
                            type="text"
                            id="firstname"
                            placeholder="Enter your first name"
                            value={data.firstname}
                            onChange={(e) => setData({...data, firstName: e.target.value})}
                            required
                        />
                    </div>
                    <div className="signup-input-group">
                        <label htmlFor="password">Last Name</label>
                        <input
                            type="text"
                            id="lastname"
                            placeholder="Enter your last name"
                            value={data.lastname}
                            onChange={(e) => setData({...data, lastName: e.target.value})}
                        />
                    </div>
                    <div className="signup-input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Enter your username"
                            value={data.username}
                            onChange={(e) => setData({...data, username: e.target.value})}
                            required
                        />
                    </div>
                    <div className="signup-input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="Enter your email"
                            value={data.email}
                            onChange={(e) => setData({...data, email: e.target.value})}
                            required
                        />
                    </div>
                    <div className="signup-input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            value={data.password}
                            onChange={(e) => setData({...data, password: e.target.value})}
                            required
                        />
                    </div>
                    <button type="submit" className="signup-button">
                        Sign Up
                    </button>
                </form>
                <div className="signup-additional-links signup-centerdv">
                    <Link to="/signin">
                        Already have an account? Sign in
                    </Link>
                </div>
                
                <pixel-canvas
                data-gap="35"
                data-speed="30"
                data-colors="#e0f2fe, #7dd3fc, #0ea5e9"
            />
                
            </div>
        </div>
    );
}