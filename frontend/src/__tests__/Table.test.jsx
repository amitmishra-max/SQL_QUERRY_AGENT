import { render, screen } from '@testing-library/react'
import Table from '../pages/Table'

describe('Table Component', () => {

  it('renders correct number of data rows', () => {
    const response = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ]

    render(<Table response={response} />)

    // 1 header row + 3 body rows = 4 total
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBe(4)
  })

  it('renders column headers correctly', () => {
    const response = [
      { id: 1, name: 'Alice', salary: 50000 }
    ]

    render(<Table response={response} />)

    expect(screen.getByText('id')).toBeTruthy()
    expect(screen.getByText('name')).toBeTruthy()
    expect(screen.getByText('salary')).toBeTruthy()
  })

  it('handles duplicate column names by renaming', () => {
    const response = {
      result: [{ name: 'Alice', name_2: 'AliceAgain' }],
      columns: ['name', 'name'],
    }

    render(<Table response={response} />)

    expect(screen.getByText('name')).toBeTruthy()
    expect(screen.getByText('name_2')).toBeTruthy()
  })

  it('handles null values gracefully', () => {
    const response = [
      { id: 1, email: null }
    ]

    render(<Table response={response} />)

    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('shows "No results found." when response array is empty', () => {
    const response = []

    render(<Table response={response} />)

    expect(screen.getByText('No results found.')).toBeTruthy()
  })

  it('renders nothing when response is null', () => {
    const { container } = render(<Table response={null} />)

    expect(container.innerHTML).toBe('')
  })

  it('displays correct row count in header', () => {
    const response = [
      { id: 1 },
      { id: 2 }
    ]

    render(<Table response={response} />)

    expect(screen.getByText('Results (2 rows)')).toBeTruthy()
  })
})
