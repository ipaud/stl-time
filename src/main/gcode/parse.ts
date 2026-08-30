import { open } from 'node:fs/promises'
import { parseSlicerDuration } from '@shared/utils/time.js'

export interface GcodeMetadata {
  estimatedSeconds: number | null
  filamentLengthMm: number | null
  filamentVolumeCm3: number | null
  filamentWeightGrams: number | null
  layerCount: number | null
}

/**
 * Orca writes everything we need in the first ~20 comment lines, before the
 * CONFIG_BLOCK. Reading a slice of the file keeps a 200 MB G-code out of memory.
 */
const HEADER_BYTES = 64 * 1024

export async function readGcodeHeader(path: string): Promise<string> {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(HEADER_BYTES)
    const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0)
    return buffer.subarray(0, bytesRead).toString('utf8')
  } finally {
    await handle.close()
  }
}

const number = (source: string, pattern: RegExp): number | null => {
  const match = source.match(pattern)
  if (!match?.[1]) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

/**
 * Tolerant on purpose: any of these fields can be missing or zero depending on
 * the preset. The FlashForge PLA preset ships filament_density = 0, so the
 * weight line reads 0.00 unless we override the density — hence the volume
 * fallback in estimateWeight().
 */
export function parseGcodeMetadata(header: string): GcodeMetadata {
  const timeMatch =
    header.match(/estimated printing time \(normal mode\)\s*=\s*(.+)/i) ??
    header.match(/estimated printing time\s*=\s*(.+)/i)

  return {
    estimatedSeconds: timeMatch?.[1] ? parseSlicerDuration(timeMatch[1].trim()) : null,
    filamentLengthMm: number(header, /filament used \[mm\]\s*=\s*([\d.]+)/i),
    filamentVolumeCm3: number(header, /filament used \[cm3\]\s*=\s*([\d.]+)/i),
    filamentWeightGrams: number(header, /(?:total )?filament used \[g\]\s*=\s*([\d.]+)/i),
    layerCount: number(header, /total layers? (?:count|number)\s*[:=]\s*(\d+)/i),
  }
}

/**
 * Weight straight from the slicer when it is non-zero, otherwise derived from
 * the extruded volume and the material density.
 */
export function estimateWeightGrams(
  metadata: GcodeMetadata,
  densityGramsPerCm3: number,
): number | null {
  if (metadata.filamentWeightGrams && metadata.filamentWeightGrams > 0) {
    return metadata.filamentWeightGrams
  }
  if (metadata.filamentVolumeCm3 && metadata.filamentVolumeCm3 > 0) {
    return metadata.filamentVolumeCm3 * densityGramsPerCm3
  }
  return null
}
