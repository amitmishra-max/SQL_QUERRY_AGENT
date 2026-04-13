import api, { authAPI, queryAPI, historyAPI } from '../services/api'


describe('API client', () => {
  it('attaches Authorization header when token exists', async () => {
    window.localStorage.setItem('token', 'test-token')
    const config = { headers: {} }
    const handler = api.interceptors.request.handlers[0].fulfilled

    const result = await handler(config)

    expect(result.headers.Authorization).toBe('Bearer test-token')
  })

  it('does not attach Authorization header when token is missing', async () => {
    window.localStorage.removeItem('token')
    const config = { headers: {} }
    const handler = api.interceptors.request.handlers[0].fulfilled

    const result = await handler(config)

    expect(result.headers.Authorization).toBeUndefined()
  })

  it('authAPI methods call the correct endpoints', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} })
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: {} })

    await authAPI.login({ email: 'a@test.com', password: 'pass' })
    expect(postSpy).toHaveBeenCalledWith('/api/auth/login', {
      email: 'a@test.com',
      password: 'pass',
    })

    await authAPI.register({ email: 'b@test.com', password: 'pass', full_name: 'Name' })
    expect(postSpy).toHaveBeenCalledWith('/api/auth/register', {
      email: 'b@test.com',
      password: 'pass',
      full_name: 'Name',
    })

    await authAPI.getMe()
    expect(getSpy).toHaveBeenCalledWith('/api/auth/me')

    postSpy.mockRestore()
    getSpy.mockRestore()
  })

  it('queryAPI uses the right paths and payloads', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} })

    await queryAPI.getSchema('sqlite+aiosqlite://')
    expect(postSpy).toHaveBeenCalledWith('/api/query/schema', {
      connection_string: 'sqlite+aiosqlite://',
    })

    await queryAPI.askQuestion('What is one?', 'sqlite+aiosqlite://')
    expect(postSpy).toHaveBeenCalledWith('/api/query/ask', {
      question: 'What is one?',
      connection_string: 'sqlite+aiosqlite://',
    })

    postSpy.mockRestore()
  })

  it('historyAPI uses the correct request methods', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: [] })
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} })
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} })

    await historyAPI.getHistory({ skip: 0, limit: 10 })
    expect(getSpy).toHaveBeenCalledWith('/api/history/', { params: { skip: 0, limit: 10 } })

    await historyAPI.getHistoryItem(5)
    expect(getSpy).toHaveBeenCalledWith('/api/history/5')

    await historyAPI.toggleBookmark(7)
    expect(postSpy).toHaveBeenCalledWith('/api/history/7/bookmark')

    await historyAPI.deleteHistory(9)
    expect(deleteSpy).toHaveBeenCalledWith('/api/history/9')

    getSpy.mockRestore()
    postSpy.mockRestore()
    deleteSpy.mockRestore()
  })
})
