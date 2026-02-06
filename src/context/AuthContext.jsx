import { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      api.getProfile()
        .then((data) => {
          const role = data.role != null ? String(data.role).toUpperCase().replace(/^ROLE_/, '') : null
          setUser({
            id: data.id,
            email: data.email || null,
            phone: data.phone || null,
            role: role || null,
          })
        })
        .catch(() => {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            const role = payload.role != null ? String(payload.role).toUpperCase().replace(/^ROLE_/, '') : null
            setUser({ id: null, email: payload.sub || null, role: role || null, phone: null })
          } catch {
            setUser({ id: null, email: null, role: null, phone: null })
          }
        })
        .finally(() => setLoading(false))
    } else {
      localStorage.removeItem('token')
      setUser(null)
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    setToken(data.token)
    const profile = await api.getProfile()
    const role = profile.role != null ? String(profile.role).toUpperCase().replace(/^ROLE_/, '') : null
    setUser({ id: profile.id, email: profile.email, phone: profile.phone || null, role: role || null })
    return data
  }

  const register = async (email, password, role = 'CUSTOMER', phone = '') => {
    const data = await api.register(email, password, role, phone)
    if (data.token) {
      setToken(data.token)
      const profile = await api.getProfile()
      const profileRole = profile.role != null ? String(profile.role).toUpperCase().replace(/^ROLE_/, '') : null
      setUser({ id: profile.id, email: profile.email, phone: profile.phone || null, role: profileRole || null })
    }
    return data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const role = user?.role ?? ''
  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isOwner: role === 'OWNER' || role === 'ADMIN',
    isAdmin: role === 'ADMIN',
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
