import { createContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const token = localStorage.getItem('token')
    if (!token) {
      setIsAuthenticated(false)
      setLoading(false)
      return () => { ignore = true }
    }

    authAPI.getMe()
      .then(() => {
        if (!ignore && localStorage.getItem('token') === token) {
          setIsAuthenticated(true)
        }
      })
      .catch(() => {
        if (!ignore && localStorage.getItem('token') === token) {
          localStorage.removeItem('token')
          setIsAuthenticated(false)
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => { ignore = true }
  }, [])

  const login = useCallback((token) => {
    localStorage.setItem('token', token)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
