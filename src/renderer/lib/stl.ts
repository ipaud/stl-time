import { type BufferGeometry, Vector3 } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ADVENTURER_5M_PRO } from '@shared/printers/adventurer5mpro.js'
import { checkFit } from '@shared/utils/fit.js'
import type { ModelAnalysis } from '@shared/types.js'

export class InvalidStlError extends Error {
  constructor() {
    super("This file doesn't look like a valid STL.")
    this.name = 'InvalidStlError'
  }
}

export interface LoadedModel {
  readonly geometry: BufferGeometry
  readonly analysis: ModelAnalysis
}

const loader = new STLLoader()

/**
 * Parses the STL once and derives everything downstream from that single pass:
 * the viewer geometry, the printed dimensions, the fit check and the inputs the
 * fallback estimator needs. The file is never parsed twice.
 */
export function loadStl(bytes: ArrayBuffer, filename: string, fileSizeBytes: number): LoadedModel {
  let geometry: BufferGeometry
  try {
    geometry = loader.parse(bytes)
  } catch {
    throw new InvalidStlError()
  }

  const position = geometry.getAttribute('position')
  if (!position || position.count < 3 || position.count % 3 !== 0) throw new InvalidStlError()

  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) throw new InvalidStlError()

  const size = box.getSize(new Vector3())
  if (![size.x, size.y, size.z].every((n) => Number.isFinite(n) && n > 0)) {
    throw new InvalidStlError()
  }

  const dimensions = { x: size.x, y: size.y, z: size.z }
  const { volumeMm3, surfaceAreaMm2 } = measure(geometry)

  return {
    geometry,
    analysis: {
      filename,
      fileSizeBytes,
      dimensions,
      triangleCount: position.count / 3,
      volumeMm3,
      surfaceAreaMm2,
      fitsPrinter: checkFit(dimensions, ADVENTURER_5M_PRO).fits,
    },
  }
}

/**
 * Volume by the signed-tetrahedron sum over every triangle, surface area by the
 * cross-product norm. Both are single-pass over the position buffer.
 */
function measure(geometry: BufferGeometry): { volumeMm3: number; surfaceAreaMm2: number } {
  const position = geometry.getAttribute('position')
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const ab = new Vector3()
  const ac = new Vector3()
  const cross = new Vector3()

  let signedVolume = 0
  let area = 0

  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i)
    b.fromBufferAttribute(position, i + 1)
    c.fromBufferAttribute(position, i + 2)

    signedVolume += a.dot(ab.copy(b).cross(c)) / 6

    ab.copy(b).sub(a)
    ac.copy(c).sub(a)
    area += cross.copy(ab).cross(ac).length() / 2
  }

  return { volumeMm3: Math.abs(signedVolume), surfaceAreaMm2: area }
}

export function isStlFile(name: string): boolean {
  return name.toLowerCase().endsWith('.stl')
}
