import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthSuccess = ({ onSignIn }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('clockdin_token', token);
      // optional: decode token or fetch user profile; simplest: mark signed in
      localStorage.setItem('clockdin_signedin', 'true');
      if (onSignIn) onSignIn();
      // clean url then redirect to dashboard/home
      window.history.replaceState({}, document.title, '/');
      setTimeout(() => navigate('/'), 700);
    } else {
      navigate('/login');
    }
  }, [navigate, onSignIn]);

  return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
      <h3>Signed in successfully</h3>
      <p>Redirecting to Clockdin...</p>
    </div>
  );
};

export default AuthSuccess;