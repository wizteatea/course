import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profil</h1>
      </div>

      <div className="page-content">
        <div className="profile-card card">
          <div className="profile-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="avatar-placeholder">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h2>{user?.displayName || 'Utilisateur'}</h2>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className="profile-section">
          <h3>À propos</h3>
          <div className="card info-card">
            <div className="info-row">
              <span className="info-label">Application</span>
              <span className="info-value">MealPlanner</span>
            </div>
            <div className="info-row">
              <span className="info-label">Version</span>
              <span className="info-value">1.0.0</span>
            </div>
            <div className="info-row">
              <span className="info-label">Synchronisation</span>
              <span className="info-value badge badge-success">Temps réel</span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Fonctionnalités</h3>
          <div className="card info-card">
            <div className="info-row">
              <span>📅 Planification des repas</span>
            </div>
            <div className="info-row">
              <span>📖 Gestion des recettes</span>
            </div>
            <div className="info-row">
              <span>🛒 Liste de courses automatique</span>
            </div>
            <div className="info-row">
              <span>🔄 Synchronisation entre appareils</span>
            </div>
          </div>
        </div>

        <button className="btn btn-danger btn-full logout-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
