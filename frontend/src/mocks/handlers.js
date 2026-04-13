import { http, HttpResponse } from 'msw'

const base =
  import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

/** Default handlers — override per test with server.use() */
export const handlers = [
  http.post(`${base}/api/auth/login`, () =>
    HttpResponse.json({
      access_token: 'test-token-123',
      token_type: 'bearer',
    }),
  ),
  http.post(`${base}/api/auth/register`, () =>
    HttpResponse.json({
      id: 1,
      email: 'registered@example.com',
      full_name: 'Registered User',
      is_active: true,
    }),
  ),
  http.get(`${base}/api/auth/me`, () =>
    HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
    }),
  ),
  http.post(`${base}/api/query/schema`, () =>
    HttpResponse.json({
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', is_primary_key: true },
            { name: 'email', type: 'VARCHAR' },
            { name: 'name', type: 'VARCHAR' }
          ]
        }
      ]
    }),
  ),
  http.get(`${base}/api/history/`, () =>
    HttpResponse.json([
      {
        id: 1,
        natural_question: 'Show all users',
        generated_sql: 'SELECT * FROM users',
        execution_result: '[]',
        explanation: 'This query retrieves all users',
        error_message: null,
        is_bookmarked: false,
        created_at: '2024-01-01T00:00:00Z'
      }
    ]),
  ),
  http.post(`${base}/api/query/ask`, () =>
    HttpResponse.json({
      sql: 'SELECT * FROM users',
      explanation: 'This query retrieves all users from the database',
      result: [
        { id: 1, email: 'test@example.com', name: 'Test User' }
      ],
      columns: ['id', 'email', 'name'],
      error: ''
    }),
  ),
]
