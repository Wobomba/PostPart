import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Medication from './pages/Medication';
import Insights from './pages/Insights';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={{ flexGrow: 1, padding: '2rem', marginLeft: '250px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/medication" element={<Medication />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
