import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const initialFormState = {
  fullName: '',
  email: '',
  university: '',
  password: '',
  confirmPassword: ''
};

const Register = () => {
  const [formData, setFormData] = useState(initialFormState);
  const resetForm = useCallback(() => setFormData({ ...initialFormState }), []);

  useEffect(() => {
    resetForm();
    return () => resetForm();
  }, [resetForm]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleReset = () => resetForm();
    const handlePageShow = (event) => {
      if (event.persisted) {
        resetForm();
      }
    };
    window.addEventListener('beforeunload', handleReset);
    window.addEventListener('pagehide', handleReset);
    window.addEventListener('popstate', handleReset);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('beforeunload', handleReset);
      window.removeEventListener('pagehide', handleReset);
      window.removeEventListener('popstate', handleReset);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [resetForm]);
  const { fullName, email, university, password, confirmPassword } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    if (password !== confirmPassword) {
      console.log('Passwords do not match');
    } else {
      const newUser = {
        fullName,
        email,
        university,
        password
      }
      try {
        const config = {
          headers: {
            'Content-Type': 'application/json'
          }
        }
        const body = JSON.stringify(newUser);
        const res = await axios.post('http://localhost:5000/users/register', body, config);
        console.log(res.data);
      } catch (err) {
        console.error(err.response.data);
      }
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = `http://localhost:5000/auth/google`;
  };

  return (
    <div>
      <h2>Create Account</h2>
      <form onSubmit={e => onSubmit(e)} autoComplete="off">
        <div>
          <input
            type="text"
            placeholder="Full Names"
            name="fullName"
            value={fullName}
            onChange={e => onChange(e)}
            required
            autoComplete='name'
          />
        </div>
        <div>
          <input
            type="email"
            placeholder="Email Address"
            name="email"
            value={email}
            onChange={e => onChange(e)}
            required
            autoComplete='email'
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="University/College"
            name="university"
            value={university}
            onChange={e => onChange(e)}
            autoComplete='organization'
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
            autoComplete='new-password'
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Confirm Password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={e => onChange(e)}
            minLength="6"
            required
            autoComplete='new-password'
          />
        </div>
        <input type="submit" value="Register" />
      </form>
      <div className="or-separator" style={{ textAlign: 'center', margin: '20px 0', color: '#888' }}>OR</div>
      <div className="google-login" style={{ textAlign: 'center' }}>
        <button onClick={handleGoogleRegister} className="google-button" style={{ width: '100%', padding: '10px', fontSize: '16px', background: '#fff', color: '#444', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="https://www.google.com/favicon.ico" alt="Google icon" style={{ width: '20px', height: '20px' }} />
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default Register;
