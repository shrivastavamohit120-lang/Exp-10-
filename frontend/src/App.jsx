import { useState } from 'react';
import { Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthCtx, useAuth, Home, AuthPage, Detail, ListingForm, Dashboard, Admin } from './pages.jsx';

function Guard({ children, admin }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (admin && user.role !== 'admin') return <Navigate to="/" />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="nav">
      <Link to="/" className="logo">Campus<span>Loop</span></Link>
      <nav>
        <NavLink to="/">Browse</NavLink>
        {user ? (
          <>
            <NavLink to="/new">Post item</NavLink>
            <NavLink to="/dashboard">My dashboard</NavLink>
            {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
            <span className="who">{user.name}</span>
            <button className="link" onClick={() => { logout(); nav('/'); }}>Log out</button>
          </>
        ) : <NavLink to="/login">Log in</NavLink>}
      </nav>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('cl_user') || 'null'));
  const login = (token, u) => { localStorage.setItem('cl_token', token); localStorage.setItem('cl_user', JSON.stringify(u)); setUser(u); };
  const logout = () => { localStorage.removeItem('cl_token'); localStorage.removeItem('cl_user'); setUser(null); };
  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/listing/:id" element={<Detail />} />
          <Route path="/new" element={<Guard><ListingForm /></Guard>} />
          <Route path="/edit/:id" element={<Guard><ListingForm /></Guard>} />
          <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
          <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
          <Route path="*" element={<p className="empty">Page not found. <Link to="/">Go to Browse</Link></p>} />
        </Routes>
      </main>
    </AuthCtx.Provider>
  );
}
