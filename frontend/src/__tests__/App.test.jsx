/**
 * Integration tests for App.jsx route guards.
 * Covers: unauthenticated redirect, authenticated access, route protection.
 */

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

import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'

function TestWrapper() {
  return <App />
}

describe('App Route Guards', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('unauthenticated user sees login page at root', async () => {
    window.history.pushState({}, '', '/')
    render(<TestWrapper />)
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
  })

  it('authenticated user sees dashboard at root', async () => {
    localStorage.setItem('token', 'test-token')
    window.history.pushState({}, '', '/')
    render(<TestWrapper />)
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeTruthy())
  })

  it('authenticated user is redirected from /login to dashboard', async () => {
    localStorage.setItem('token', 'test-token')
    window.history.pushState({}, '', '/login')
    render(<TestWrapper />)
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeTruthy())
  })

  it('unauthenticated user is redirected from /dashboard to login', async () => {
    window.history.pushState({}, '', '/dashboard')
    render(<TestWrapper />)
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
  })
})
