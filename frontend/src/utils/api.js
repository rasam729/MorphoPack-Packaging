const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function request(method, path, body, opts = {}) {
  const url = `${API_BASE}${path}`
  const headers = { ...(opts.headers || {}) }
  let fetchBody = undefined

  if (body instanceof FormData) {
    fetchBody = body
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    fetchBody = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(url, { method, headers, body: fetchBody })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the MorphoPack API. Start the backend server and try again.')
    }
    throw error
  }
  const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const api = {
  health: ()               => request('GET', '/health'),
  register: (body)         => request('POST', '/register', body),
  login: (body)            => request('POST', '/login', body),
  googleAuth: (body)       => request('POST', '/google-auth', body),
  upload: (formData)       => request('POST', '/upload', formData),
  runPipeline: (body)      => request('POST', '/run-pipeline', body),
  pipelineStatus: ()       => request('GET', '/pipeline-status'),
  regenerateDieline: (body)=> request('POST', '/regenerate-dieline', body),
  customBox: (formData)    => request('POST', '/custom-box', formData),
  getMetrics: (params)     => request('POST', '/metrics', params),
  history: (userId)        => request('GET', `/history?user_id=${userId}`),
}

export default api
