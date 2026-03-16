import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

    navigate('/home');
    // const formData = new FormData();
    // formData.append('user_name', username);
    // formData.append('password', password);
    // formData.append('login', 'Login');

    // try {
    //   const response = await fetch('login_process.php', {
    //     method: 'POST',
    //     body: formData,
    //   });

    //   const data = await response.json();

    //   if (response.status === 200) {
    //     navigate('/home');
    //   } else if (response.status === 401) {
    //     setError(data.message || 'Invalid username or password');
    //   } else {
    //     setError('An unexpected error occurred. Please try again.');
    //   }
    // } catch (err) {
    //   setError('Something went wrong. Please try again.');
    // }
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