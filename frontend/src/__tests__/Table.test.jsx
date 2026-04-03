/**
 * Component tests for Table.jsx.
 * Covers: row rendering, column headers, duplicate columns, null values, empty state.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Table from '../pages/Table'

describe('Table Component', () => {
  it('renders correct number of data rows', () => {
    // Arrange
    const response = {
      columns: ['id', 'name'],
      result: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
    }

    // Act
    render(<Table response={response} />)

    // Assert — 3 data rows (not counting header)
    const rows = screen.getAllByRole('row')
    // 1 header row + 3 data rows = 4
    expect(rows.length).toBe(4)
  })

  it('renders column headers correctly', () => {
    // Arrange
    const response = {
      columns: ['id', 'name', 'salary'],
      result: [{ id: 1, name: 'Alice', salary: 50000 }],
    }

    // Act
    render(<Table response={response} />)

    // Assert
    expect(screen.getByText('id')).toBeTruthy()
    expect(screen.getByText('name')).toBeTruthy()
    expect(screen.getByText('salary')).toBeTruthy()
  })

  it('handles duplicate column names by renaming', () => {
    // Arrange — two columns both named "name"; first header stays "name", second is "name_2"
    const response = {
      columns: ['name', 'name'],
      result: [{ name: 'Alice' }],
    }

    // Act
    render(<Table response={response} />)

    // Assert
    expect(screen.getByText('name')).toBeTruthy()
    expect(screen.getByText('name_2')).toBeTruthy()
  })

  it('handles null values gracefully without crashing', () => {
    // Arrange
    const response = {
      columns: ['id', 'email'],
      result: [{ id: 1, email: null }],
    }

    // Act
    render(<Table response={response} />)

    // Assert — null shows em dash in body cells
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('shows "No results found." when result array is empty', () => {
    // Arrange
    const response = {
      columns: [],
      result: [],
    }

    // Act
    render(<Table response={response} />)

    // Assert
    expect(screen.getByText('No results found.')).toBeTruthy()
  })

  it('renders nothing when response is null', () => {
    // Act
    const { container } = render(<Table response={null} />)

    // Assert — should be empty
    expect(container.innerHTML).toBe('')
  })

  it('displays correct row count in header', () => {
    // Arrange
    const response = {
      columns: ['id'],
      result: [{ id: 1 }, { id: 2 }],
    }

    // Act
    render(<Table response={response} />)

    // Assert
    expect(screen.getByText('Results (2 rows)')).toBeTruthy()
  })
})
