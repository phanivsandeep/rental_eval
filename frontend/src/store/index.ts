import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type {
  UserProfile,
  AgentsState,
  Report,
  Evaluation,
  EvaluationDimension,
  AgentUpdateEvent,
} from '@/types'

const AGENT_DIMENSIONS: EvaluationDimension[] = [
  'safety', 'transportation', 'food', 'lifestyle',
  'convenience', 'utilities', 'building', 'future_risk',
]

function initialAgentsState(): AgentsState {
  return Object.fromEntries(
    AGENT_DIMENSIONS.map((d) => [d, { status: 'idle' as const }])
  ) as AgentsState
}

interface AppState {
  // ── Auth ────────────────────────────────────────────────────────────────────
  /** null while loading; User object when logged in; undefined = not resolved yet */
  user: User | null
  /** true when the user explicitly chose "Continue as Guest" */
  isGuest: boolean
  authLoading: boolean
  setUser: (u: User | null) => void
  setIsGuest: (v: boolean) => void
  setAuthLoading: (v: boolean) => void
  signOut: () => void

  /** True when the user is authenticated OR has chosen guest mode */
  get isAuthenticated(): boolean

  // ── Session (anonymous backend session) ─────────────────────────────────────
  sessionId: string | null
  hasApiKey: boolean
  setSessionId: (id: string) => void
  setHasApiKey: (v: boolean) => void

  // ── Profile ─────────────────────────────────────────────────────────────────
  profile: UserProfile | null
  setProfile: (p: UserProfile | null) => void

  // ── Current evaluation ───────────────────────────────────────────────────────
  evaluationId: string | null
  evaluationAddress: string
  agents: AgentsState
  report: Report | null
  isEvaluating: boolean
  evaluationError: string | null

  startEvaluation: (address: string) => void
  applyAgentUpdate: (event: AgentUpdateEvent) => void
  setReport: (id: string, report: Report) => void
  setEvaluationError: (msg: string) => void
  resetEvaluation: () => void

  // ── History ──────────────────────────────────────────────────────────────────
  history: Omit<Evaluation, 'report'>[]
  setHistory: (h: Omit<Evaluation, 'report'>[]) => void
  removeFromHistory: (id: string) => void
}

export const useAppStore = create<AppState>()((set, get) => ({
  // Auth
  user: null,
  isGuest: false,
  authLoading: true,
  setUser: (u) => set({ user: u, authLoading: false, isGuest: false }),
  setIsGuest: (v) => set({ isGuest: v, authLoading: false }),
  setAuthLoading: (v) => set({ authLoading: v }),
  signOut: () => set({
    user: null,
    isGuest: false,
    profile: null,
    hasApiKey: false,
    sessionId: null,
    history: [],
    report: null,
    evaluationId: null,
    evaluationAddress: '',
    agents: initialAgentsState(),
    isEvaluating: false,
    evaluationError: null,
  }),

  get isAuthenticated() {
    return get().user !== null || get().isGuest
  },

  // Session
  sessionId: null,
  hasApiKey: false,
  setSessionId: (id) => set({ sessionId: id }),
  setHasApiKey: (v) => set({ hasApiKey: v }),

  // Profile
  profile: null,
  setProfile: (p) => set({ profile: p }),

  // Evaluation
  evaluationId: null,
  evaluationAddress: '',
  agents: initialAgentsState(),
  report: null,
  isEvaluating: false,
  evaluationError: null,

  startEvaluation: (address) => set({
    isEvaluating: true,
    evaluationAddress: address,
    agents: initialAgentsState(),
    report: null,
    evaluationError: null,
    evaluationId: null,
  }),

  applyAgentUpdate: (event) => set((state) => ({
    agents: {
      ...state.agents,
      [event.agent]: {
        status: event.status === 'complete' ? 'complete'
               : event.status === 'failed' ? 'failed'
               : 'running',
        score: event.score,
        summary: event.summary,
      },
    },
  })),

  setReport: (id, report) => set({ report, evaluationId: id, isEvaluating: false }),
  setEvaluationError: (msg) => set({ evaluationError: msg, isEvaluating: false }),
  resetEvaluation: () => set({
    evaluationId: null,
    evaluationAddress: '',
    agents: initialAgentsState(),
    report: null,
    isEvaluating: false,
    evaluationError: null,
  }),

  // History
  history: [],
  setHistory: (h) => set({ history: h }),
  removeFromHistory: (id) => set((state) => ({
    history: state.history.filter((e) => e.id !== id),
  })),
}))
