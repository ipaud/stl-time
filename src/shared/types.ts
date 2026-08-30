import type { QualityPresetId } from './profiles/quality.js'

export interface Dimensions {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Geometry facts extracted from the STL in the renderer, once. */
export interface ModelAnalysis {
  readonly filename: string
  readonly fileSizeBytes: number
  readonly dimensions: Dimensions
  readonly triangleCount: number
  /** Solid volume in mm3, from the signed-tetrahedron sum. */
  readonly volumeMm3: number
  /** Total triangle area in mm2. Drives the shell term of the fallback model. */
  readonly surfaceAreaMm2: number
  readonly fitsPrinter: boolean
}

export type EstimateSource = 'slicer' | 'fallback'

export interface PrintEstimate {
  readonly preset: QualityPresetId
  readonly estimatedSeconds: number
  readonly filamentLengthMm?: number
  readonly filamentWeightGrams?: number
  /** True when the number came from the fallback model, not a real slice. */
  readonly approximate: boolean
  readonly source: EstimateSource
  /** Set when the slicer failed and we fell back; shown as a quiet notice. */
  readonly notice?: string
}

export type PresetProgress = 'pending' | 'processing' | 'done' | 'error'

export interface SlicerInfo {
  readonly available: boolean
  readonly name?: string
  readonly version?: string
}

export interface AppSettings {
  /** Spool price in EUR per kilogram. */
  readonly plaPricePerKg: number
}

export const DEFAULT_SETTINGS: AppSettings = { plaPricePerKg: 20 }

/** Everything the renderer knows about a file it just opened. */
export interface OpenedFile {
  readonly path: string
  readonly name: string
  readonly sizeBytes: number
  readonly bytes: ArrayBuffer
}
