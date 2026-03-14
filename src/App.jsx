import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Planning from './pages/Planning';
import Recipes from './pages/Recipes';
import ShoppingList from './pages/ShoppingList';
import Profile from './pages/Profile';
import Login from './pages/Login';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/planning" />} />
          <Route path="/planning" element={<PrivateRoute><Planning /></PrivateRoute>} />
          <Route path="/recettes" element={<PrivateRoute><Recipes /></PrivateRoute>} />
          <Route path="/courses" element={<PrivateRoute><ShoppingList /></PrivateRoute>} />
          <Route path="/profil" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/login" element={<Navigate to="/planning" />} />
          <Route path="*" element={<Navigate to="/planning" />} />
        </Routes>
      </div>
      <nav className="bottom-nav">
        <NavLink to="/planning" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Planning</span>
        </NavLink>
        <NavLink to="/recettes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span>Recettes</span>
        </NavLink>
        <NavLink to="/courses" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          <span>Courses</span>
        </NavLink>
        <NavLink to="/profil" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profil</span>
        </NavLink>
      </nav>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
