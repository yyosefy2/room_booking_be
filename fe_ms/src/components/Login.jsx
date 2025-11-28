import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegisterMode) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || `${isRegisterMode ? 'Registration' : 'Login'} failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setName('');
    setConfirmPassword('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Room Booking System</h1>
        <h2>{isRegisterMode ? 'Register' : 'Login'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={isRegisterMode ? 'Min 8 characters' : 'Enter your password'}
            />
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
            </div>
          )}
          
          <button type="submit" disabled={isLoading}>
            {isLoading 
              ? (isRegisterMode ? 'Registering...' : 'Logging in...') 
              : (isRegisterMode ? 'Register' : 'Login')
            }
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            {isRegisterMode ? 'Already have an account?' : 'Don\'t have an account?'}
            {' '}
            <button type="button" onClick={toggleMode} className="link-button">
              {isRegisterMode ? 'Login' : 'Register'}
            </button>
          </p>
        </div>
        
        {!isRegisterMode && (
          <div className="demo-credentials">
            <p>Demo credentials:</p>
            <p>Email: admin@example.com</p>
            <p>Password: Admin123!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
