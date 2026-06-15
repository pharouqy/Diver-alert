import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }   from './context/AuthContext'
import { SocketProvider }          from './context/SocketContext'
import LoginPage     from './pages/LoginPage'
import RegisterPage  from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'

function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>
      ⏳ Chargement...
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Loading />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Loading />
  return user ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"         element={<Navigate to="/login" replace />} />
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="*"         element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>   {/* ← ajouté — doit être dans AuthProvider pour useAuth() */}
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}