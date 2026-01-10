import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Description as LogsIcon,
  Medication as MedicationIcon,
  Insights as InsightsIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/logs', label: 'Logs', icon: <LogsIcon /> },
  { path: '/medication', label: 'Medication', icon: <MedicationIcon /> },
  { path: '/insights', label: 'Insights', icon: <InsightsIcon /> },
  { path: '/profile', label: 'Profile', icon: <ProfileIcon /> },
  { path: '/login', label: 'Logout', icon: <LogoutIcon /> }
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside
      style={{
        width: '250px',
        height: '100vh',
        backgroundColor: '#1e1e2f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 0',
        position: 'fixed',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        zIndex: 1200
      }}
    >
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <img
          src="/default.jpg"
          alt="User"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '2px solid #66bb6a'
          }}
        />
        <h4 style={{ color: '#fff', marginTop: '0.75rem' }}>User</h4>
      </div>
      <nav style={{ width: '100%' }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.8rem 1.5rem',
              textDecoration: 'none',
              color: location.pathname === item.path ? '#fff' : '#ccc',
              backgroundColor: location.pathname === item.path ? '#00796B' : 'transparent',
              fontWeight: '500',
              transition: 'background 0.3s ease'
            }}
          >
            <span style={{ marginRight: '1rem' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
