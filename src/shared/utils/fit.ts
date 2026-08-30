import type { PrinterProfile } from '../printers/adventurer5mpro.js'
import type { Dimensions } from '../types.js'

export type Axis = 'x' | 'y' | 'z'

export interface FitResult {
  readonly fits: boolean
  /** Axes that exceed the build volume, largest overflow first. */
  readonly exceeded: readonly { axis: Axis; modelMm: number; limitMm: number }[]
}

const AXES: readonly Axis[] = ['x', 'y', 'z']

export function checkFit(dimensions: Dimensions, printer: PrinterProfile): FitResult {
  const exceeded = AXES.map((axis) => ({
    axis,
    modelMm: dimensions[axis],
    limitMm: printer.buildVolume[axis],
  }))
    .filter((entry) => entry.modelMm > entry.limitMm)
    .sort((a, b) => b.modelMm - b.limitMm - (a.modelMm - a.limitMm))

  return { fits: exceeded.length === 0, exceeded }
}

const AXIS_LABEL: Record<Axis, string> = { x: 'width', y: 'depth', z: 'height' }

export function axisLabel(axis: Axis): string {
  return AXIS_LABEL[axis]
}
