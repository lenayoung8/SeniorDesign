import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './login.css';
import Logo from '../../assets/logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        // Save user info to localStorage for use across the app
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/home');
      }

    } catch (err) {
      // 401 = wrong credentials, 500 = server error
      if (err.response?.status === 401) {
        setError(err.response.data.message || 'Invalid username or password');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="login-page">
      <img src={Logo} width="300" alt="Logo" style={{ marginBottom: '24px' }} />

      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}