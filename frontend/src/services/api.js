const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '')

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(`Could not reach the API at ${API_BASE_URL}. Is the backend running?`)
  }

  if (!response.ok) {
    let detail = `Request failed with HTTP ${response.status}.`
    try {
      const payload = await response.json()
      if (typeof payload.detail === 'string') detail = payload.detail
      else if (Array.isArray(payload.detail)) detail = payload.detail.map((issue) => issue.msg).join('; ')
    } catch {
      // Keep the status-based message when an error response has no JSON body.
    }
    throw new Error(detail)
  }

  if (response.status === 204) return null
  return response.json()
}

/** Check whether the configured FastAPI service responds to GET /health. */
export function checkApiHealth({ signal } = {}) {
  return request('/health', { method: 'GET', signal })
}

export function fetchResources() {
  return request('/api/resources')
}

/** Compare the selected resources with the three backend knapsack algorithms. */
export function compareAlgorithms(resources, budget) {
  return request('/api/algorithms/compare', {
    method: 'POST',
    body: JSON.stringify({
      resources: resources.map(({ id, name, cost, priority }) => ({ id, name, cost, priority })),
      budget,
    }),
  })
}

export function fetchResource(resourceId) {
  return request(`/api/resources/${encodeURIComponent(resourceId)}`)
}

export function createResource(resource) {
  return request('/api/resources', { method: 'POST', body: JSON.stringify(resource) })
}

export function updateResource(resourceId, resource) {
  return request(`/api/resources/${encodeURIComponent(resourceId)}`, {
    method: 'PUT',
    body: JSON.stringify(resource),
  })
}

export function deleteResource(resourceId) {
  return request(`/api/resources/${encodeURIComponent(resourceId)}`, { method: 'DELETE' })
}
