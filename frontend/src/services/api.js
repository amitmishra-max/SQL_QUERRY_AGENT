import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me')
}

// Query API
export const queryAPI = {
  getSchema: (connection_string = null) => api.post('/api/query/schema', { connection_string }),
  askQuestion: (question, connection_string = null) => api.post('/api/query/ask', { question, connection_string })
}

// History API
export const historyAPI = {
  getHistory: (params = {}) => api.get('/api/history/', { params }),
  getHistoryItem: (id) => api.get(`/api/history/${id}`),
  toggleBookmark: (id) => api.post(`/api/history/${id}/bookmark`),
  deleteHistory: (id) => api.delete(`/api/history/${id}`)
}

export default api
