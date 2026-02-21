import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DriverDashboard from './pages/DriverDashboard';
import DriverManagement from './pages/DriverManagement';
import DutyRecords from './pages/DutyRecords';
import ExpenseManagement from './pages/ExpenseManagement';
import PayrollView from './pages/PayrollView';
import Settings from './pages/Settings';
import DutyApproval from './pages/DutyApproval';
import AdvancesManagement from './pages/AdvancesManagement';
import BonusesManagement from './pages/BonusesManagement';
import LeaveManagement from './pages/LeaveManagement';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={user.role === 'admin' ? '/admin' : '/driver'} />}
          />
          <Route
            path="/admin"
            element={user && user.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/driver"
            element={user && user.role === 'driver' ? <DriverDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/drivers"
            element={user && user.role === 'admin' ? <DriverManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/duty-records"
            element={user && user.role === 'admin' ? <DutyRecords user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/expenses"
            element={user && user.role === 'admin' ? <ExpenseManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/payroll/:driverId/:year/:month"
            element={user ? <PayrollView user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={user && user.role === 'admin' ? <Settings user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/duty-approvals"
            element={user && user.role === 'admin' ? <DutyApproval user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/advances"
            element={user && user.role === 'admin' ? <AdvancesManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/bonuses"
            element={user && user.role === 'admin' ? <BonusesManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/leaves"
            element={user && user.role === 'admin' ? <LeaveManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/driver') : '/login'} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
