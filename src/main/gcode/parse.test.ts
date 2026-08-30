import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { estimateWeightGrams, parseGcodeMetadata } from './parse.js'

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`, 'utf8')

describe('parseGcodeMetadata', () => {
  test('reads a real Orca-Flashforge header', () => {
    const meta = parseGcodeMetadata(fixture('orca-header-with-density.gcode'))
    expect(meta.estimatedSeconds).toBe(29 * 60 + 19)
    expect(meta.filamentLengthMm).toBeCloseTo(1838.71)
    expect(meta.filamentVolumeCm3).toBeCloseTo(4.42)
    expect(meta.filamentWeightGrams).toBeCloseTo(5.48)
    expect(meta.layerCount).toBe(100)
  })

  test('reads the header FlashForge presets produce with density 0', () => {
    const meta = parseGcodeMetadata(fixture('orca-header-no-density.gcode'))
    expect(meta.estimatedSeconds).toBe(19 * 60 + 18)
    expect(meta.filamentLengthMm).toBeCloseTo(1336.29)
    expect(meta.filamentVolumeCm3).toBeCloseTo(3.21)
    expect(meta.filamentWeightGrams).toBe(0)
  })

  test('returns nulls instead of throwing on unrelated text', () => {
    const meta = parseGcodeMetadata('G1 X1 Y1\nG1 X2 Y2\n')
    expect(meta.estimatedSeconds).toBeNull()
    expect(meta.filamentLengthMm).toBeNull()
    expect(meta.layerCount).toBeNull()
  })
})

describe('estimateWeightGrams', () => {
  test('prefers the value the slicer reported', () => {
    const meta = parseGcodeMetadata(fixture('orca-header-with-density.gcode'))
    expect(estimateWeightGrams(meta, 1.24)).toBeCloseTo(5.48)
  })

  test('derives grams from volume when the slicer reported zero', () => {
    const meta = parseGcodeMetadata(fixture('orca-header-no-density.gcode'))
    expect(estimateWeightGrams(meta, 1.24)).toBeCloseTo(3.21 * 1.24)
  })

  test('returns null when there is nothing to work from', () => {
    expect(estimateWeightGrams(parseGcodeMetadata(''), 1.24)).toBeNull()
  })
})
