const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || import.meta.env.NEXT_PUBLIC_GATEWAY_URL || 'https://gateway.sentinel.momentumgrowthagency.com'
const GATEWAY_API_KEY = import.meta.env.VITE_GATEWAY_API_KEY || ''

export const getGatewayUrl = () => GATEWAY_URL
export const getGatewayApiKey = () => GATEWAY_API_KEY

export const getGatewayToken = () => localStorage.getItem('gateway_token')
export const setGatewayToken = (token: string) => localStorage.setItem('gateway_token', token)
export const clearGatewayToken = () => localStorage.removeItem('gateway_token')

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getGatewayToken()
  
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (GATEWAY_API_KEY) {
    headers.set('x-api-key', GATEWAY_API_KEY)
  }
  headers.set('Content-Type', 'application/json')

  let response: Response

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    response = await fetch(`${GATEWAY_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
  } catch (error: any) {
    // Network-level failures (CORS, DNS, timeout, offline)
    if (error.name === 'AbortError') {
      throw new Error(`Gateway request timed out. The server at ${GATEWAY_URL} is not responding. Please check that the Gateway is running and accessible.`)
    }
    if (!navigator.onLine) {
      throw new Error('You appear to be offline. Please check your internet connection and try again.')
    }
    // "Failed to fetch" — usually CORS or unreachable server
    throw new Error(
      `Unable to reach Gateway API at ${GATEWAY_URL}${endpoint}. ` +
      'This is typically caused by: (1) the Gateway server being down, ' +
      '(2) a CORS configuration issue, or (3) a network/firewall block. ' +
      `Original error: ${error.message}`
    )
  }

  if (response.status === 401 || response.status === 403) {
    clearGatewayToken()
    const errorData = await response.json().catch(() => ({}))
    const msg = errorData.message || (response.status === 401 ? 'Session expired or invalid credentials.' : 'Access denied. You do not have permission for this resource.')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?error=unauthorized'
    }
    throw new Error(msg)
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Gateway returned ${response.status} ${response.statusText} for ${endpoint}`)
  }

  return response.json()
}

export const api = {
  login: (email: string) => 
    request<{ token: string; email: string; client_name: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  
  getDashboard: () => request<any>('/portal/dashboard'),
  
  getAudits: (pageSize = 20, offset = 0) => 
    request<any>(`/portal/audits?page_size=${pageSize}&offset=${offset}`),
  
  getAudit: (id: string) => request<any>(`/portal/audits/${id}`),
  
  getTickets: () => request<any>('/portal/tickets'),
  
  createTicket: (data: { category: string; message: string; audit_record_id?: string }) => 
    request<any>('/portal/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getArtifacts: () => request<any>('/portal/artifacts'),
}
