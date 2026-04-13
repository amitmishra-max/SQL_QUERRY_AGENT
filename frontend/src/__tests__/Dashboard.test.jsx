vi.mock('../services/api', () => ({
  queryAPI: {
    getSchema: vi.fn(),
    askQuestion: vi.fn(),
  },
  historyAPI: {
    getHistory: vi.fn(),
    toggleBookmark: vi.fn(),
  },
}))

vi.mock('../pages/SchemaVisualization', () => ({
  default: () => <div data-testid="schema-vis" />,
}))

vi.mock('../pages/Table', () => ({
  default: ({ response }) => (
    <div data-testid="table" data-sql={response?.sql || ''} />
  ),
}))

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../pages/Dashboard'
import { queryAPI, historyAPI } from '../services/api'

describe('Dashboard page', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Set up mock implementations
    queryAPI.getSchema.mockResolvedValue({ data: { tables: [] } })
    historyAPI.getHistory.mockResolvedValue({ data: [] })
    queryAPI.askQuestion.mockResolvedValue({
      data: { sql: '', explanation: '', result: [], columns: [], error: '' }
    })
  })

  it('loads schema and history on mount', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(queryAPI.getSchema).toHaveBeenCalled()
      expect(historyAPI.getHistory).toHaveBeenCalled()
    })

    expect(screen.getByTestId('schema-vis')).toBeTruthy()
  })

  it('submits a question and renders results', async () => {
    queryAPI.askQuestion.mockResolvedValueOnce({
      data: {
        sql: 'SELECT 1',
        explanation: 'Test explanation',
        result: [{ n: 1 }],
        columns: ['n'],
        error: '',
      },
    })

    render(<Dashboard />)
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByTestId('schema-vis')).toBeTruthy())

    await user.type(screen.getByPlaceholderText(/Ask a question/), 'How many rows?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() => expect(queryAPI.askQuestion).toHaveBeenCalled())
    expect(screen.getByTestId('table').getAttribute('data-sql')).toBe('SELECT 1')
  })

  it('handles unauthorized session on ask and removes token', async () => {
    window.localStorage.setItem('token', 'bad-token')
    queryAPI.askQuestion.mockRejectedValueOnce({ response: { status: 401 } })

    render(<Dashboard />)
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByTestId('schema-vis')).toBeTruthy())

    await user.type(screen.getByPlaceholderText(/Ask a question/), 'Show rows')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() => expect(queryAPI.askQuestion).toHaveBeenCalled())
    await waitFor(() => expect(window.localStorage.getItem('token')).toBeNull())
    expect(screen.getByText(/Session expired/)).toBeTruthy()
  })

  it('fetches schema again when custom connection string is entered and blurred', async () => {
    queryAPI.getSchema.mockResolvedValue({ data: { tables: [] } })

    render(<Dashboard />)
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByTestId('schema-vis')).toBeTruthy())

    await user.click(screen.getByLabelText(/Custom Connection String/))
    const input = screen.getByPlaceholderText(/e\.g\. mysql\+pymysql:\/\/user:pass@localhost:3306\/dbname/)
    await user.type(input, 'sqlite+aiosqlite://')
    await user.tab()

    await waitFor(() => expect(queryAPI.getSchema).toHaveBeenCalledWith('sqlite+aiosqlite://'))
  })
})
