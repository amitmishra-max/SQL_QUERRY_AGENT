import { render, screen } from '@testing-library/react'
import Table from '../pages/Table'


describe('Table component formatting', () => {
  it('renders boolean values as True or False', () => {
    render(
      <Table
        response={{
          result: [{ active: true, disabled: false }],
          columns: ['active', 'disabled'],
        }}
      />,
    )

    expect(screen.getByText('True')).toBeTruthy()
    expect(screen.getByText('False')).toBeTruthy()
  })

  it('renders null and undefined values as a dash', () => {
    render(
      <Table
        response={{
          result: [{ a: null, b: undefined }],
          columns: ['a', 'b'],
        }}
      />,
    )

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('renders object and array values as JSON strings', () => {
    render(
      <Table
        response={{
          result: [{ data: { x: 1 }, tags: ['a', 'b'] }],
          columns: ['data', 'tags'],
        }}
      />,
    )

    expect(screen.getByText(/"x": 1/)).toBeTruthy()
    expect(screen.getByText(/"a",\s*"b"/)).toBeTruthy()
  })

  it('renames duplicate column names with numbered suffixes', () => {
    render(
      <Table
        response={{
          result: [{ name: 'Alice', name_2: 'Alice' }],
          columns: ['name', 'name'],
        }}
      />,
    )

    expect(screen.getByText('name')).toBeTruthy()
    expect(screen.getByText('name_2')).toBeTruthy()
  })

  it('shows no results message when result array is empty', () => {
    render(
      <Table
        response={{
          result: [],
          columns: [],
        }}
      />,
    )

    expect(screen.getByText('No results found.')).toBeTruthy()
  })
})
