import type { PrinterProfile } from '@shared/printers/adventurer5mpro.js'
import type { QualityProfile } from '@shared/profiles/quality.js'
import type { ModelAnalysis } from '@shared/types.js'

export interface SliceRequest {
  readonly inputPath: string
  readonly outputDir: string
  readonly profile: QualityProfile
  readonly printer: PrinterProfile
  readonly analysis: ModelAnalysis
  readonly signal: AbortSignal
}

export interface SliceResult {
  readonly estimatedSeconds: number
  readonly filamentLengthMm?: number
  readonly filamentWeightGrams?: number
  readonly approximate: boolean
}

export interface SlicerEngine {
  readonly id: string
  available(): Promise<boolean>
  slice(request: SliceRequest): Promise<SliceResult>
}
