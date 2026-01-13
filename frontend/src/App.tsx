import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import { RootState } from './store/store';
import { setUser } from './store/slices/authSlice';
import { authAPI } from './api/apiClient';

import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Auth/Login';
import Loans from './pages/Loans/Loans';
import LoanDetail from './pages/Loans/LoanDetail';
import Verifications from './pages/Verifications/Verifications';
import Reports from './pages/Reports/Reports';
import DataSources from './pages/DataSources/DataSources';
import Users from './pages/Users/Users';
import PricingDashboard from './pages/Pricing/PricingDashboard';
import RiskDashboard from './pages/Risk/RiskDashboard';
import SFDRDashboard from './pages/SFDR/SFDRDashboard';
import CollaborationPortal from './pages/Collaboration/CollaborationPortal';
import ExportInterface from './pages/Export/ExportInterface';

const App: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (isAuthenticated && token) {
      authAPI.getCurrentUser()
        .then((response) => {
          dispatch(setUser(response.data));
        })
        .catch((error) => {
          // Token expired or invalid - user will be redirected to login
          if (error.response?.status === 401) {
            console.log('Session expired. Please log in again.');
          } else {
            console.error('Failed to fetch user:', error);
          }
        });
    }
  }, [isAuthenticated, dispatch]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/loans" element={<Loans />} />
                  <Route path="/loans/:id" element={<LoanDetail />} />
                  <Route path="/verifications" element={<Verifications />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/data-sources" element={<DataSources />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/pricing" element={<PricingDashboard />} />
                  <Route path="/risk" element={<RiskDashboard />} />
                  <Route path="/sfdr" element={<SFDRDashboard />} />
                  <Route path="/collaboration" element={<CollaborationPortal />} />
                  <Route path="/export" element={<ExportInterface />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Box>
  );
};

export default App;
