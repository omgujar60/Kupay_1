/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/hooks/use-auth';
import { Toaster } from '@/components/ui/sonner';

// Pages
import LandingPage from '@/src/pages/landing';
import AuthPage from '@/src/pages/auth';
import DashboardPage from '@/src/pages/dashboard';
import FamilyPage from '@/src/pages/family';
import ChatPage from '@/src/pages/chat';
import ExpensesPage from '@/src/pages/expenses';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  
  return <>{children}</>;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/family" 
          element={
            <PrivateRoute>
              <FamilyPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/expenses" 
          element={
            <PrivateRoute>
              <ExpensesPage />
            </PrivateRoute>
          } 
        />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

