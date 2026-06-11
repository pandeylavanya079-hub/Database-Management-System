import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RouteGuard from './components/RouteGuard';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Receivables from './pages/Receivables';
import Payables from './pages/Payables';
import Logistics from './pages/Logistics';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Bills from './pages/Bills';
import { ToastProvider } from './context/ToastContext';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Secure ERP Portal Layout Routes */}
          <Route element={<RouteGuard />}>
            <Route element={<Layout />}>
              {/* Accessible by Admin, Manager, and Staff */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/logistics" element={<Logistics />} />

              {/* Accessible by Admin & Manager only */}
              <Route element={<RouteGuard allowedRoles={['Admin', 'Manager']} />}>
                <Route path="/receivables" element={<Receivables />} />
                <Route path="/payables" element={<Payables />} />
                <Route path="/billing" element={<Bills />} />
              </Route>

              {/* Accessible by Admin only */}
              <Route element={<RouteGuard allowedRoles={['Admin']} />}>
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/users" element={<Users />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  </ToastProvider>
  );
};

export default App;
