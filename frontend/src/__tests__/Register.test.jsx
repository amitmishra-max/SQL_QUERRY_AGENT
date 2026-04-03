/**
 * Component tests for Register.jsx (API via MSW).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Register from '../pages/Register'
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

const API = 'http://127.0.0.1:8000'

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )
}

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields: name, email, password', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('Full Name')).toBeTruthy()
    expect(screen.getByPlaceholderText('Email address')).toBeTruthy()
    expect(screen.getByPlaceholderText('Password')).toBeTruthy()
  })

  it('renders sign up button', () => {
    renderRegister()
    expect(screen.getByText('Sign up')).toBeTruthy()
  })

  it('renders link to login page', () => {
    renderRegister()
    expect(screen.getByText(/Already have an account/)).toBeTruthy()
  })

  it('displays error on duplicate email registration', async () => {
    server.use(
      http.post(`${API}/api/auth/register`, () =>
        HttpResponse.json(
          { detail: 'Email already registered' },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByPlaceholderText('Full Name'), 'Test User')
    await user.type(screen.getByPlaceholderText('Email address'), 'dup@test.com')
    await user.type(screen.getByPlaceholderText('Password'), 'pass123')
    await user.click(screen.getByText('Sign up'))
    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeTruthy()
    })
  })

  it('shows loading state during registration', async () => {
    server.use(
      http.post(`${API}/api/auth/register`, () => new Promise(() => {})),
    )
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByPlaceholderText('Full Name'), 'Test')
    await user.type(screen.getByPlaceholderText('Email address'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('Password'), 'pass123')
    await user.click(screen.getByText('Sign up'))
    await waitFor(() => {
      expect(screen.getByText('Creating account...')).toBeTruthy()
    })
  })

  it('navigates to login on successful registration', async () => {
    const user = userEvent.setup()
    renderRegister()
    await user.type(screen.getByPlaceholderText('Full Name'), 'New User')
    await user.type(screen.getByPlaceholderText('Email address'), 'new@test.com')
    await user.type(screen.getByPlaceholderText('Password'), 'pass123')
    await user.click(screen.getByText('Sign up'))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})
