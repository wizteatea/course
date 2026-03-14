import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const results = [];

    // Test 1 : Auth
    if (user) {
      results.push({ label: 'Auth', status: 'ok', detail: user.email });
    } else {
      results.push({ label: 'Auth', status: 'error', detail: 'Non connecté' });
      setTestResult(results);
      setTesting(false);
      return;
    }

    // Test 2 : Écriture Firestore
    try {
      await setDoc(doc(db, '_test', 'ping'), { ts: Date.now(), by: user.email });
      results.push({ label: 'Écriture Firestore', status: 'ok', detail: 'OK' });
    } catch (err) {
      results.push({ label: 'Écriture Firestore', status: 'error', detail: err.message });
    }

    // Test 3 : Lecture Firestore
    try {
      const snap = await getDoc(doc(db, '_test', 'ping'));
      if (snap.exists()) {
        results.push({ label: 'Lecture Firestore', status: 'ok', detail: JSON.stringify(snap.data()) });
      } else {
        results.push({ label: 'Lecture Firestore', status: 'error', detail: 'Document non trouvé' });
      }
    } catch (err) {
      results.push({ label: 'Lecture Firestore', status: 'error', detail: err.message });
    }

    // Test 4 : Lire les plannings
    try {
      const snap = await getDocs(collection(db, 'plannings'));
      results.push({ label: 'Plannings', status: 'ok', detail: `${snap.docs.length} planning(s) trouvé(s)` });
    } catch (err) {
      results.push({ label: 'Plannings', status: 'error', detail: err.message });
    }

    // Test 5 : Lire les recettes
    try {
      const snap = await getDocs(collection(db, 'recipes'));
      results.push({ label: 'Recettes', status: 'ok', detail: `${snap.docs.length} recette(s) trouvée(s)` });
    } catch (err) {
      results.push({ label: 'Recettes', status: 'error', detail: err.message });
    }

    setTestResult(results);
    setTesting(false);
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
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              UID: {user?.uid}
            </p>
          </div>
        </div>

        {/* Diagnostic Firebase */}
        <div className="profile-section">
          <h3>Diagnostic Firebase</h3>
          <div className="card info-card">
            <div className="info-row" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? 'Test en cours...' : 'Tester la connexion Firebase'}
              </button>
            </div>
            {testResult && testResult.map((r, i) => (
              <div key={i} className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 16 }}>{r.status === 'ok' ? '✅' : '❌'}</span>
                  <span className="info-label" style={{ fontWeight: 600 }}>{r.label}</span>
                </div>
                <span style={{
                  fontSize: 12,
                  color: r.status === 'ok' ? 'var(--success)' : 'var(--danger)',
                  wordBreak: 'break-all',
                  paddingLeft: 28,
                }}>
                  {r.detail}
                </span>
              </div>
            ))}
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
