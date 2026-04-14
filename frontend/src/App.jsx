import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useContext, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'
import ERDiagram from './pages/ERDiagram'
import { AuthProvider, AuthContext } from './context/AuthContext'
import { SchemaProvider } from './context/SchemaContext'
import logoUrl from '../../logo.png'

function AppRoutes() {
  const { isAuthenticated, loading } = useContext(AuthContext)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route 
            path="/er-diagram" 
            element={
              isAuthenticated ? <ERDiagram /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Register />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          pauseOnHover
          closeOnClick
          draggable={false}
          theme="light"
          toastClassName="auth-toast-shell"
          bodyClassName="auth-toast-body"
          progressClassName="auth-toast-progress"
        />
      </div>
    </Router>
  )
}

function App() {
  useEffect(() => {
    let favicon = document.querySelector("link[rel='icon']")
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.href = logoUrl
  }, [])

  return (
    <SchemaProvider>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
    </SchemaProvider>
  )
}

export default App
