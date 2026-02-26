import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';
import deerGif from '../../assets/deer-buck.gif';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Always go to Deer page (the "home page")
    navigate('/home');
  };

  return (
    <div className="login-page">
      <h1>Login</h1>
      <img src={deerGif} width="200" alt="Deer" />

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
        <button type="submit">Login</button>
      </form>
    </div>
  );
}