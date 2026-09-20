import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Spinner from './components/Spinner';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import EditExpenseScreen from './screens/EditExpenseScreen';
import DebtsScreen from './screens/DebtsScreen';
import NewSessionScreen from './screens/NewSessionScreen';
import JoinSessionScreen from './screens/JoinSessionScreen';

function ProtectedRoute({ children }) {
  const auth = useAuth();
  const loading = auth?.loading ?? true;
  const user = auth?.user ?? null;
  if (loading) return <Spinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const auth = useAuth();
  const loading = auth?.loading ?? true;
  const user = auth?.user ?? null;
  if (loading) return <Spinner fullPage />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterScreen /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
      <Route path="/group/:id" element={<ProtectedRoute><GroupDetailScreen /></ProtectedRoute>} />
      <Route path="/add" element={<ProtectedRoute><AddExpenseScreen /></ProtectedRoute>} />
      <Route path="/expense/:expenseId/edit" element={<ProtectedRoute><EditExpenseScreen /></ProtectedRoute>} />
      <Route path="/debiti" element={<ProtectedRoute><DebtsScreen /></ProtectedRoute>} />
      <Route path="/nuova-sessione" element={<ProtectedRoute><NewSessionScreen /></ProtectedRoute>} />
      <Route path="/unisciti" element={<ProtectedRoute><JoinSessionScreen /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
