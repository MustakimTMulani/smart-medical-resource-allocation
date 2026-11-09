import { useRef, useState } from 'react'
import { LoaderCircle, Wifi, WifiOff } from 'lucide-react'
import { API_BASE_URL, checkApiHealth } from '../services/api'

export default function ApiConnectionStatus() {
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')
  const requestRef = useRef(null)

  const testConnection = async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const timeoutId = window.setTimeout(() => controller.abort(), 5000)
    setState('checking')
    setMessage('Checking the FastAPI health endpoint…')
    try {
      await checkApiHealth({ signal: controller.signal })
      setState('connected')
      setMessage(`Backend reachable at ${API_BASE_URL}.`)
    } catch (error) {
      setState('error')
      setMessage(error.name === 'AbortError' ? 'The API health check timed out.' : error.message)
    } finally {
      window.clearTimeout(timeoutId)
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  const Icon = state === 'checking' ? LoaderCircle : state === 'connected' ? Wifi : WifiOff
  const label = state === 'checking' ? 'Checking…' : state === 'connected' ? 'API connected' : state === 'error' ? 'API unavailable' : 'Test API'
  return <div className={`api-connection api-${state}`}>
    <button type="button" onClick={testConnection} disabled={state === 'checking'} aria-label="Test connection to the FastAPI backend" title={`Backend: ${API_BASE_URL}`}>
      <Icon size={14} className={state === 'checking' ? 'api-spin' : ''} />
      <span>{label}</span>
    </button>
    <span className="sr-only" role="status" aria-live="polite">{message}</span>
  </div>
}
