/**
 * Single source of truth for the only printer STL Time supports.
 *
 * The build volume and preset filenames below were read from the official
 * FlashForge presets shipped inside Orca-Flashforge / Flash Studio:
 *   Contents/Resources/profiles/Flashforge/machine/
 *     Flashforge Adventurer 5M Pro 0.4 Nozzle.json
 *       printable_area:   -110x-110 .. 110x110   ->  220 x 220 mm
 *       printable_height: 220
 */
export interface PrinterProfile {
  readonly id: string
  readonly name: string
  readonly manufacturer: string
  readonly buildVolume: { readonly x: number; readonly y: number; readonly z: number }
  readonly nozzleDiameter: number
  readonly filamentDiameter: number
  /** Filename of the machine preset inside the slicer's Flashforge profile folder. */
  readonly machinePreset: string
  /** Filename of the filament preset inside the slicer's Flashforge profile folder. */
  readonly filamentPreset: string
}

export const ADVENTURER_5M_PRO: PrinterProfile = {
  id: 'flashforge-adventurer-5m-pro',
  name: 'Adventurer 5M Pro',
  manufacturer: 'FlashForge',
  buildVolume: { x: 220, y: 220, z: 220 },
  nozzleDiameter: 0.4,
  filamentDiameter: 1.75,
  machinePreset: 'Flashforge Adventurer 5M Pro 0.4 Nozzle.json',
  filamentPreset: 'Flashforge Generic PLA.json',
}

export interface MaterialProfile {
  readonly id: string
  readonly name: string
  /** g/cm3 */
  readonly density: number
}

/** MVP ships PLA only; the shape allows PETG/ABS later without touching callers. */
export const PLA: MaterialProfile = { id: 'pla', name: 'PLA', density: 1.24 }
