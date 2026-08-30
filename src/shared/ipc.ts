import type {
  AppSettings,
  ModelAnalysis,
  PresetProgress,
  PrintEstimate,
  SlicerInfo,
} from './types.js'
import type { QualityPresetId } from './profiles/quality.js'

export const IPC = {
  PICK_FILE: 'file:pick',
  READ_FILE: 'file:read',
  START_JOB: 'job:start',
  CANCEL_JOB: 'job:cancel',
  JOB_EVENT: 'job:event',
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',
  SLICER_INFO: 'slicer:info',
  MENU_EVENT: 'menu:event',
  OPEN_PATH: 'file:open-path',
} as const

export interface StartJobRequest {
  readonly path: string
  readonly analysis: ModelAnalysis
}

/** Streamed from main to renderer. Always tagged with the job it belongs to. */
export type JobEvent =
  | { readonly jobId: string; readonly kind: 'status'; readonly message: string }
  | {
      readonly jobId: string
      readonly kind: 'preset'
      readonly preset: QualityPresetId
      readonly progress: PresetProgress
      readonly estimate?: PrintEstimate
      readonly error?: string
    }
  | { readonly jobId: string; readonly kind: 'done' }
  | { readonly jobId: string; readonly kind: 'failed'; readonly message: string }

export type MenuEvent = 'open-file' | 'open-settings'

export interface StlTimeApi {
  pickFile(): Promise<{ path: string; name: string; sizeBytes: number } | null>
  readFile(path: string): Promise<{ name: string; sizeBytes: number; bytes: ArrayBuffer }>
  startJob(request: StartJobRequest): Promise<string>
  cancelJob(jobId: string): Promise<void>
  onJobEvent(listener: (event: JobEvent) => void): () => void
  onMenuEvent(listener: (event: MenuEvent) => void): () => void
  /** Fired when the OS hands the app a file: Finder, the dock, or argv. */
  onOpenPath(listener: (path: string) => void): () => void
  getSettings(): Promise<AppSettings>
  setSettings(settings: AppSettings): Promise<AppSettings>
  getSlicerInfo(): Promise<SlicerInfo>
  /** Resolves a dropped File to an absolute path without exposing Node to the page. */
  pathForFile(file: File): string
}
