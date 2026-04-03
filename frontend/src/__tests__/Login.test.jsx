/**
 * Component tests for Login.jsx (API via MSW).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AuthContext } from '../context/AuthContext'
import Login from '../pages/Login'
import { server } from '../mocks/server'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const API = 'http://127.0.0.1:8000'

const mockLogin = vi.fn()

function renderLogin() {
  return render(
    <AuthContext.Provider
      value={{
        isAuthenticated: false,
        loading: false,
        login: mockLogin,
        logout: vi.fn(),
      }}
    >
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('Email address')).toBeTruthy()
    expect(screen.getByPlaceholderText('Password')).toBeTruthy()
  })

  it('renders sign in button', () => {
    renderLogin()
    expect(screen.getByText('Sign in')).toBeTruthy()
  })

  it('renders link to register page', () => {
    renderLogin()
    expect(screen.getByText(/Don't have an account/)).toBeTruthy()
  })

  it('submit button shows loading state while signing in', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () => new Promise(() => {})),
    )
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('Email address'), 'u@test.com')
    await user.type(screen.getByPlaceholderText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeTruthy()
    })
  })

  it('displays error message on failed login', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () =>
        HttpResponse.json(
          { detail: 'Incorrect email or password' },
          { status: 401 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('Email address'), 'bad@test.com')
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpass')
    await user.click(screen.getByText('Sign in'))
    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password')).toBeTruthy()
    })
  })

  it('calls login context and navigates to dashboard on success', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('Email address'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('Password'), 'validpass')
    await user.click(screen.getByText('Sign in'))
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test-token-123')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })
})
