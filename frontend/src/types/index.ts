// ─── Profile ──────────────────────────────────────────────────────────────────

export type Transportation = 'car' | 'no_car' | 'ev'
export type Household = 'solo' | 'couple' | 'family'
export type WorkSchedule = '9-5' | 'remote' | 'night_shift' | 'irregular'

export type EvaluationDimension =
  | 'safety'
  | 'transportation'
  | 'food'
  | 'lifestyle'
  | 'convenience'
  | 'utilities'
  | 'building'
  | 'future_risk'

export interface UserProfile {
  ethnicity?: string
  food_preferences: string[]
  exercise_routine?: string
  outdoor_preferences: string[]
  work_schedule?: WorkSchedule
  work_location?: string
  transportation?: Transportation
  household?: Household
  has_pets: boolean
  pet_type?: string
  budget?: number
  health_conditions: string[]
  priorities: EvaluationDimension[]
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type EvaluationStatus = 'pending' | 'running' | 'complete' | 'failed'
export type AgentStatus = 'idle' | 'running' | 'complete' | 'failed'

export interface MonthlyCostEstimate {
  rent: number
  electricity: number
  gas: number
  internet: number
  transit_pass?: number
  parking?: number
  renters_insurance?: number
  total_estimate: number
}

export interface DimensionResult {
  score: number
  summary: string
  details: string
}

export interface Report {
  overall_score: number
  persona_narrative: string
  pros: string[]
  cons: string[]
  red_flags: string[]
  monthly_cost_estimate: MonthlyCostEstimate
  sections: Record<EvaluationDimension, DimensionResult>
}

export interface Evaluation {
  id: string
  address: string
  overall_score?: number
  status: EvaluationStatus
  created_at: string
  report?: Report
}

// ─── SSE Events ───────────────────────────────────────────────────────────────

export interface AgentUpdateEvent {
  agent: EvaluationDimension
  status: 'running' | 'complete' | 'failed'
  score?: number
  summary?: string
}

export interface AgentState {
  status: AgentStatus
  score?: number
  summary?: string
}

export type AgentsState = Record<EvaluationDimension, AgentState>

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ProfileResponse {
  profile: UserProfile
}

export interface ReportsListResponse {
  reports: Omit<Evaluation, 'report'>[]
}

export interface EvaluationResponse {
  id: string
  address: string
  report: Report
  created_at: string
}
