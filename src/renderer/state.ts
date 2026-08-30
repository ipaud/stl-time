import type { BufferGeometry } from 'three'
import type { JobEvent } from '@shared/ipc.js'
import { QUALITY_PROFILES, type QualityPresetId } from '@shared/profiles/quality.js'
import type { ModelAnalysis, PresetProgress, PrintEstimate } from '@shared/types.js'

export type Status = 'idle' | 'loading' | 'analyzing' | 'estimating' | 'ready' | 'error'

export interface PresetState {
  readonly progress: PresetProgress
  readonly estimate?: PrintEstimate
  readonly error?: string
}

export interface AppState {
  readonly status: Status
  readonly statusMessage: string
  readonly errorMessage: string | null
  readonly jobId: string | null
  readonly geometry: BufferGeometry | null
  readonly analysis: ModelAnalysis | null
  readonly presets: Record<QualityPresetId, PresetState>
  readonly selected: QualityPresetId
}

const pending: Record<QualityPresetId, PresetState> = Object.fromEntries(
  QUALITY_PROFILES.map((profile) => [profile.id, { progress: 'pending' as const }]),
) as Record<QualityPresetId, PresetState>

export const initialState: AppState = {
  status: 'idle',
  statusMessage: '',
  errorMessage: null,
  jobId: null,
  geometry: null,
  analysis: null,
  presets: pending,
  selected: 'standard',
}

export type Action =
  | { type: 'loading'; filename: string }
  | { type: 'analyzed'; geometry: BufferGeometry; analysis: ModelAnalysis }
  | { type: 'job-started'; jobId: string }
  | { type: 'job-event'; event: JobEvent }
  | { type: 'select'; preset: QualityPresetId }
  | { type: 'error'; message: string }
  | { type: 'reset' }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'loading':
      // Dropping a new file wipes the previous one outright, so nothing from the
      // old model can linger on screen next to the new one.
      return {
        ...initialState,
        status: 'loading',
        statusMessage: 'Reading STL…',
        selected: state.selected,
      }

    case 'analyzed':
      return {
        ...state,
        status: 'analyzing',
        statusMessage: 'Analyzing geometry…',
        geometry: action.geometry,
        analysis: action.analysis,
      }

    case 'job-started':
      return { ...state, status: 'estimating', jobId: action.jobId }

    case 'job-event':
      return applyJobEvent(state, action.event)

    case 'select':
      return { ...state, selected: action.preset }

    case 'error':
      return { ...initialState, status: 'error', errorMessage: action.message }

    case 'reset':
      return initialState
  }
}

/** Events from a job the user has already replaced are dropped on the floor. */
function applyJobEvent(state: AppState, event: JobEvent): AppState {
  if (event.jobId !== state.jobId) return state

  switch (event.kind) {
    case 'status':
      return { ...state, statusMessage: event.message }

    case 'preset': {
      const next: PresetState = {
        progress: event.progress,
        ...(event.estimate ? { estimate: event.estimate } : {}),
        ...(event.error ? { error: event.error } : {}),
      }
      return {
        ...state,
        statusMessage:
          event.progress === 'processing' ? `${labelOf(event.preset)}…` : state.statusMessage,
        presets: { ...state.presets, [event.preset]: next },
      }
    }

    case 'done':
      return { ...state, status: 'ready', statusMessage: '' }

    case 'failed':
      return { ...state, status: 'error', errorMessage: event.message }
  }
}

const labelOf = (preset: QualityPresetId): string =>
  QUALITY_PROFILES.find((p) => p.id === preset)?.label ?? preset

/** The estimate whose filament figures are shown in the detail row. */
export function detailEstimate(state: AppState): PrintEstimate | null {
  return state.presets[state.selected]?.estimate ?? null
}

export function anyApproximate(state: AppState): boolean {
  return QUALITY_PROFILES.some((p) => state.presets[p.id]?.estimate?.approximate === true)
}
