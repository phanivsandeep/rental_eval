import type {
  UserProfile,
  ProfileResponse,
  ReportsListResponse,
  EvaluationResponse,
  AgentUpdateEvent,
  Report,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function createSession(): Promise<{ session_id: string }> {
  return apiFetch('/session', { method: 'POST' })
}

// ─── API Key ──────────────────────────────────────────────────────────────────

export async function saveApiKey(api_key: string): Promise<{ success: boolean }> {
  return apiFetch('/key', {
    method: 'POST',
    body: JSON.stringify({ api_key }),
  })
}

export async function deleteApiKey(): Promise<void> {
  await apiFetch('/key', { method: 'DELETE' })
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<ProfileResponse> {
  return apiFetch('/profile')
}

export async function saveProfile(profile: UserProfile): Promise<ProfileResponse> {
  return apiFetch('/profile', {
    method: 'POST',
    body: JSON.stringify({ profile }),
  })
}

// ─── Evaluation (SSE) ─────────────────────────────────────────────────────────

export interface EvaluationCallbacks {
  onStarted: (evaluationId: string, address: string) => void
  onAgentUpdate: (event: AgentUpdateEvent) => void
  onComplete: (evaluationId: string, report: Report) => void
  onError: (message: string) => void
}

export function startEvaluation(
  address: string,
  callbacks: EvaluationCallbacks
): () => void {
  const url = new URL(`${BASE_URL}/evaluate`)
  // POST body can't go in EventSource; we use a fetch-based SSE approach
  const controller = new AbortController()

  fetch(url.toString(), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ address }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}))
        callbacks.onError((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let eventType = ''
        let dataLine = ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            dataLine = line.slice(5).trim()
          } else if (line === '' && eventType && dataLine) {
            // Dispatch
            try {
              const payload = JSON.parse(dataLine)
              if (eventType === 'started') {
                callbacks.onStarted(payload.evaluation_id, payload.address)
              } else if (eventType === 'agent_update') {
                callbacks.onAgentUpdate(payload as AgentUpdateEvent)
              } else if (eventType === 'complete') {
                callbacks.onComplete(payload.evaluation_id, payload.report)
              } else if (eventType === 'error') {
                callbacks.onError(payload.message)
              }
            } catch {
              // malformed JSON — skip
            }
            eventType = ''
            dataLine = ''
          }
        }
      }
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err.message)
      }
    })

  return () => controller.abort()
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(): Promise<ReportsListResponse> {
  return apiFetch('/reports')
}

export async function getReport(evaluationId: string): Promise<EvaluationResponse> {
  return apiFetch(`/reports/${evaluationId}`)
}

export async function deleteReport(evaluationId: string): Promise<void> {
  await apiFetch(`/reports/${evaluationId}`, { method: 'DELETE' })
}
