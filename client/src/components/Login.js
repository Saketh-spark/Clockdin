import React, { useState } from 'react';
import axios from 'axios';
import './Login.css'; // Ensure a CSS file is linked for styling

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { email, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    const user = {
      email,
      password
    }
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      }
      const body = JSON.stringify(user);
  const res = await axios.post('/api/users/login', body, config);
      console.log(res.data);
    } catch (err) {
      console.error(err.response.data);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `http://localhost:5000/auth/google`;
  };

  return (
    <div className="login-container">
      <h2>Sign In</h2>
      <form onSubmit={e => onSubmit(e)}>
        <div>
          <input
            type="email"
            placeholder="Email Address"
            name="email"
            value={email}
            onChange={e => onChange(e)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            name="password"
            value={password}
            onChange={e => onChange(e)}
            minLength="6"
            required
          />
        </div>
        <input type="submit" value="Sign In" className="primary-button" />
      </form>
      <div className="or-separator" style={{ textAlign: 'center', margin: '20px 0', color: '#888' }}>OR</div>
      <div className="google-login" style={{ textAlign: 'center' }}>
        <button onClick={handleGoogleLogin} className="google-button" style={{ width: '100%', padding: '10px', fontSize: '16px', background: '#fff', color: '#444', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="https://www.google.com/favicon.ico" alt="Google icon" style={{ width: '20px', height: '20px' }} />
          Continue with Google
        </button>
      </div>
      <div className="additional-options">
        <p>Don't have an account? <a href="/register">Create Account</a></p>
      </div>
    </div>
  );
};

export default Login;
