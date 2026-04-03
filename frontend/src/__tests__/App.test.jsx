/**
 * Integration tests for App.jsx route guards.
 * Covers: unauthenticated redirect, authenticated access, route protection.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock the page components to simplify route testing
vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}))
vi.mock('../pages/Register', () => ({
  default: () => <div data-testid="register-page">Register Page</div>,
}))
vi.mock('../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}))

// Mock react-toastify 
vi.mock('react-toastify', () => ({
  ToastContainer: () => null,
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('App Route Guards', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('unauthenticated user sees login page at root', () => {
    // Arrange — no token
    window.history.pushState({}, '', '/')

    // Act
    render(<App />)

    // Assert — should redirect to login
    expect(screen.getByTestId('login-page')).toBeTruthy()
  })

  it('authenticated user sees dashboard at root', () => {
    // Arrange
    localStorage.setItem('token', 'valid-token')
    window.history.pushState({}, '', '/')

    // Act
    render(<App />)

    // Assert
    expect(screen.getByTestId('dashboard-page')).toBeTruthy()
  })

  it('authenticated user is redirected from /login to dashboard', () => {
    // Arrange
    localStorage.setItem('token', 'valid-token')
    window.history.pushState({}, '', '/login')

    // Act
    render(<App />)

    // Assert
    expect(screen.getByTestId('dashboard-page')).toBeTruthy()
  })

  it('unauthenticated user is redirected from /dashboard to login', () => {
    // Arrange — no token
    window.history.pushState({}, '', '/dashboard')

    // Act
    render(<App />)

    // Assert
    expect(screen.getByTestId('login-page')).toBeTruthy()
  })
})
