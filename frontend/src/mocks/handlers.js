import { http, HttpResponse } from 'msw'

const base =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

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
]
