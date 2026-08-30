import { PLA } from '@shared/printers/adventurer5mpro.js'
import type { QualityPresetId } from '@shared/profiles/quality.js'
import type { SliceRequest, SliceResult, SlicerEngine } from './engine.js'

/**
 * Used when no slicer is installed or a slice fails. Everything it returns is
 * flagged approximate and rounded, so the UI never implies precision it does
 * not have.
 *
 * The constants below are not guesses. They were fitted against real slices
 * made with the official FlashForge presets on this printer, across five very
 * different shapes (20 mm cube, 100 mm cube, a thin torus knot, a 20x20x150
 * tower and a 120x120x3 plate) and all three presets. The fit minimises the
 * worst relative error rather than nailing any single shape, which lands every
 * case inside about a third either way.
 *
 * See README > "How the approximate estimate works" before touching these.
 */

/** Extrusion width, ~1.05 x the 0.4 mm nozzle. */
const LINE_WIDTH_MM = 0.42

/** Effective wall + top/bottom shell thickness. */
const SHELL_THICKNESS_MM = 0.745

/** Share of the interior that actually gets extruded. */
const INFILL_FRACTION = 0.198

/** Cross-section of 1.75 mm filament, mm2. */
const FILAMENT_AREA_MM2 = Math.PI * (1.75 / 2) ** 2

/** Fitted effective speed and per-layer overhead, by preset. */
const MOTION: Record<QualityPresetId, { speedMmPerS: number; layerOverheadS: number }> = {
  fast: { speedMmPerS: 42.25, layerOverheadS: 7.75 },
  standard: { speedMmPerS: 49.25, layerOverheadS: 7.75 },
  quality: { speedMmPerS: 64.25, layerOverheadS: 8.85 },
}

/**
 * Approximate numbers are rounded so they never read as precise: whole minutes
 * for short prints, 5 minute steps once we are past an hour.
 */
const roundApprox = (seconds: number): number => {
  const step = seconds >= 3600 ? 300 : 60
  return Math.max(step, Math.round(seconds / step) * step)
}

export class FallbackEstimator implements SlicerEngine {
  readonly id = 'fallback'

  async available(): Promise<boolean> {
    return true
  }

  async slice(request: SliceRequest): Promise<SliceResult> {
    return estimate(request)
  }
}

export function estimate(request: SliceRequest): SliceResult {
  const { analysis, profile } = request
  const motion = MOTION[profile.id]

  const shellVolume = Math.min(analysis.surfaceAreaMm2 * SHELL_THICKNESS_MM, analysis.volumeMm3)
  const interiorVolume = Math.max(analysis.volumeMm3 - shellVolume, 0)
  const extrudedMm3 = shellVolume + interiorVolume * INFILL_FRACTION

  const pathMm = extrudedMm3 / (LINE_WIDTH_MM * profile.layerHeight)
  const layers = Math.max(1, Math.ceil(analysis.dimensions.z / profile.layerHeight))

  const seconds = pathMm / motion.speedMmPerS + layers * motion.layerOverheadS

  return {
    estimatedSeconds: roundApprox(seconds),
    filamentLengthMm: extrudedMm3 / FILAMENT_AREA_MM2,
    filamentWeightGrams: (extrudedMm3 / 1000) * PLA.density,
    approximate: true,
  }
}

export const fallbackEngine = new FallbackEstimator()
