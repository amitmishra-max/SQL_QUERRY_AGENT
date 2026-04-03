/**
 * Component tests for SchemaVisualization.jsx (React Flow schema graph).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SchemaVisualization from '../pages/SchemaVisualization'

describe('SchemaVisualization', () => {
  const mockSchema = {
    tables: [
      {
        table_name: 'employees',
        columns: [
          { column_name: 'id', data_type: 'int', is_nullable: 'NO', is_primary_key: true },
          { column_name: 'name', data_type: 'varchar', is_nullable: 'NO', is_primary_key: false },
          { column_name: 'dept_id', data_type: 'int', is_nullable: 'YES', is_primary_key: false },
        ],
        foreign_keys: [
          { column: 'dept_id', references_table: 'departments', references_column: 'id' },
        ],
      },
      {
        table_name: 'departments',
        columns: [
          { column_name: 'id', data_type: 'int', is_nullable: 'NO', is_primary_key: true },
          { column_name: 'name', data_type: 'varchar', is_nullable: 'NO', is_primary_key: false },
        ],
        foreign_keys: [],
      },
    ],
  }

  function renderWithSize(ui) {
    return render(<div style={{ width: 800, height: 600 }}>{ui}</div>)
  }

  it('renders table names from schema', async () => {
    renderWithSize(<SchemaVisualization schema={mockSchema} />)

    expect(await screen.findByText('employees')).toBeTruthy()
    expect(await screen.findByText('departments')).toBeTruthy()
  })

  it('renders column names and types', async () => {
    renderWithSize(<SchemaVisualization schema={mockSchema} />)

    await screen.findByText('dept_id')
    const names = await screen.findAllByText('name')
    expect(names.length).toBeGreaterThanOrEqual(2)
    // Types sit in nested spans; assert on serialized DOM
    expect(document.body.textContent).toMatch(/varchar/)
    expect(document.body.textContent).toMatch(/\(int\)/)
  })

  it('renders primary key indicator for key columns', async () => {
    renderWithSize(<SchemaVisualization schema={mockSchema} />)

    await screen.findByText('employees')
    expect(document.body.textContent).toContain('🔑')
  })

  it('shows fallback when schema is null', () => {
    render(<SchemaVisualization schema={null} />)

    expect(
      screen.getByText(/No schema available\. Connect to a database to view the schema\./)
    ).toBeTruthy()
  })

  it('shows fallback when schema has no tables', () => {
    render(<SchemaVisualization schema={{ tables: [] }} />)

    expect(
      screen.getByText(/No schema available\. Connect to a database to view the schema\./)
    ).toBeTruthy()
  })
})
