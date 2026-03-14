import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const { loginWithGoogle } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="login-logo">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="8" width="36" height="36" rx="4" />
            <line x1="32" y1="4" x2="32" y2="12" />
            <line x1="16" y1="4" x2="16" y2="12" />
            <line x1="6" y1="20" x2="42" y2="20" />
            <circle cx="18" cy="30" r="3" fill="currentColor" />
            <circle cx="30" cy="30" r="3" fill="currentColor" />
          </svg>
        </div>
        <h1>MealPlanner</h1>
        <p>Planifiez vos repas ensemble et simplifiez vos courses</p>
        <button className="login-btn" onClick={handleLogin}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connexion avec Google
        </button>
      </div>
    </div>
  );
}
