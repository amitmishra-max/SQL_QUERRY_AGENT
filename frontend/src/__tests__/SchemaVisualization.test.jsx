import { render, screen } from '@testing-library/react'
import SchemaVisualization from '../pages/SchemaVisualization'


describe('SchemaVisualization', () => {
  it('renders table and column names from schema', async () => {
    const schema = {
      tables: [
        {
          table_name: 'employees',
          columns: [
            { column_name: 'id', data_type: 'int', is_nullable: 'NO', is_primary_key: true },
            { column_name: 'name', data_type: 'varchar', is_nullable: 'YES', is_primary_key: false },
          ],
          foreign_keys: [],
        },
      ],
    }

    render(<SchemaVisualization schema={schema} />)

    expect(await screen.findByText('employees')).toBeTruthy()
    expect(screen.getByText('id')).toBeTruthy()
    expect(screen.getByText('name')).toBeTruthy()
  })

  it('renders fallback message when no schema is provided', () => {
    render(<SchemaVisualization schema={null} />)

    expect(screen.getByText(/No schema available/)).toBeTruthy()
  })
})
