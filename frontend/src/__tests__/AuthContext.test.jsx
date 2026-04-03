/**
 * Tests for AuthContext.
 * Covers: initial state with/without token, login(), logout().
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useContext } from 'react'
import { AuthContext, AuthProvider } from '../context/AuthContext'

// Helper component that exposes context values for testing
function AuthConsumer() {
  const { isAuthenticated, loading, login, logout } = useContext(AuthContext)
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <button data-testid="login-btn" onClick={() => login('test-token')}>Login</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initial state is unauthenticated when no token in localStorage', async () => {
    // Act
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    // Assert
    expect(screen.getByTestId('auth').textContent).toBe('no')
  })

  it('initial state is authenticated when token exists in localStorage', () => {
    // Arrange
    localStorage.setItem('token', 'existing-token')

    // Act
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    // Assert
    expect(screen.getByTestId('auth').textContent).toBe('yes')
  })

  it('login sets token in localStorage and updates authenticated state', async () => {
    // Act
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByTestId('login-btn').click()
    })

    // Assert
    expect(localStorage.getItem('token')).toBe('test-token')
    expect(screen.getByTestId('auth').textContent).toBe('yes')
  })

  it('logout clears token and sets unauthenticated', async () => {
    // Arrange
    localStorage.setItem('token', 'existing-token')

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    // Act
    await act(async () => {
      screen.getByTestId('logout-btn').click()
    })

    // Assert
    expect(localStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('auth').textContent).toBe('no')
  })
})
