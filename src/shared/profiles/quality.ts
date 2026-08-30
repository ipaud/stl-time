/**
 * The three presets are the official FlashForge process profiles for the
 * Adventurer 5M Pro with a 0.4 nozzle — the only ones FlashForge publishes for
 * that nozzle. We deliberately do not override walls, shells or infill, so the
 * numbers match what the user would see in Flash Studio itself.
 */
export type QualityPresetId = 'fast' | 'standard' | 'quality'

export interface QualityProfile {
  readonly id: QualityPresetId
  readonly label: string
  readonly layerHeight: number
  readonly processPreset: string
  readonly recommended?: boolean
}

export const QUALITY_PROFILES: readonly QualityProfile[] = [
  {
    id: 'fast',
    label: 'Fast',
    layerHeight: 0.24,
    processPreset: '0.24mm Draft @Flashforge AD5M Pro 0.4 Nozzle.json',
  },
  {
    id: 'standard',
    label: 'Standard',
    layerHeight: 0.2,
    processPreset: '0.20mm Standard @Flashforge AD5M Pro 0.4 Nozzle.json',
    recommended: true,
  },
  {
    id: 'quality',
    label: 'Quality',
    layerHeight: 0.12,
    processPreset: '0.12mm Fine @Flashforge AD5M Pro 0.4 Nozzle.json',
  },
]

export const QUALITY_IDS = QUALITY_PROFILES.map((p) => p.id)

export function getQualityProfile(id: QualityPresetId): QualityProfile {
  const found = QUALITY_PROFILES.find((p) => p.id === id)
  if (!found) throw new Error(`Unknown quality preset: ${id}`)
  return found
}

export function isQualityPresetId(value: unknown): value is QualityPresetId {
  return typeof value === 'string' && QUALITY_IDS.includes(value as QualityPresetId)
}
