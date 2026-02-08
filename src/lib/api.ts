const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || import.meta.env.NEXT_PUBLIC_GATEWAY_URL || 'https://gateway.sentinel.momentumgrowthagency.com'

export const getGatewayToken = () => localStorage.getItem('gateway_token')
export const setGatewayToken = (token: string) => localStorage.setItem('gateway_token', token)
export const clearGatewayToken = () => localStorage.removeItem('gateway_token')

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getGatewayToken()
  
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  headers.set('Content-Type', 'application/json')

  const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401 || response.status === 403) {
    // Handle unauthorized
    clearGatewayToken()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?error=unauthorized'
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `API request failed with status ${response.status}`)
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
