import { describe, expect, test } from 'vitest'
import { ADVENTURER_5M_PRO } from '@shared/printers/adventurer5mpro.js'
import { QUALITY_PROFILES, getQualityProfile } from '@shared/profiles/quality.js'
import type { ModelAnalysis } from '@shared/types.js'
import { estimate } from './fallback.js'
import type { SliceRequest } from './engine.js'

const cube = (side: number): ModelAnalysis => ({
  filename: `cube${side}.stl`,
  fileSizeBytes: 684,
  dimensions: { x: side, y: side, z: side },
  triangleCount: 12,
  volumeMm3: side ** 3,
  surfaceAreaMm2: 6 * side ** 2,
  fitsPrinter: true,
})

const shape = (
  surfaceAreaMm2: number,
  volumeMm3: number,
  dimensions: { x: number; y: number; z: number },
): ModelAnalysis => ({
  filename: 'shape.stl',
  fileSizeBytes: 0,
  triangleCount: 0,
  fitsPrinter: true,
  dimensions,
  surfaceAreaMm2,
  volumeMm3,
})

const request = (
  analysis: ModelAnalysis,
  preset: 'fast' | 'standard' | 'quality',
): SliceRequest => ({
  inputPath: '/tmp/x.stl',
  outputDir: '/tmp',
  profile: getQualityProfile(preset),
  printer: ADVENTURER_5M_PRO,
  analysis,
  signal: new AbortController().signal,
})

describe('fallback estimator', () => {
  test('always declares itself approximate', () => {
    for (const profile of QUALITY_PROFILES) {
      expect(estimate(request(cube(20), profile.id)).approximate).toBe(true)
    }
  })

  test('returns finite, positive numbers', () => {
    const result = estimate(request(cube(50), 'standard'))
    expect(result.estimatedSeconds).toBeGreaterThan(0)
    expect(Number.isFinite(result.estimatedSeconds)).toBe(true)
    expect(result.filamentLengthMm).toBeGreaterThan(0)
    expect(result.filamentWeightGrams).toBeGreaterThan(0)
  })

  test('rounds to whole minutes, and to 5 minute steps past an hour', () => {
    const short = estimate(request(cube(5), 'fast'))
    expect(short.estimatedSeconds % 60).toBe(0)
    expect(short.estimatedSeconds).toBeGreaterThanOrEqual(60)

    const long = estimate(request(cube(100), 'standard'))
    expect(long.estimatedSeconds % 300).toBe(0)
  })

  /**
   * Real slices of five very different shapes, made with the official
   * FlashForge presets. The fallback is a fallback, so the bar is a bounded
   * worst case rather than precision: everything must land within 35%.
   */
  const REAL_SLICES: [string, ModelAnalysis, Record<'fast' | 'standard' | 'quality', number>][] = [
    ['20 mm cube', cube(20), { fast: 1045, standard: 1158, quality: 1824 }],
    ['100 mm cube', cube(100), { fast: 69236, standard: 74259, quality: 117855 }],
    [
      'thin torus knot',
      shape(5073.1, 7952.8, { x: 50.1, y: 52.1, z: 18.4 }),
      { fast: 2528, standard: 2736, quality: 3716 },
    ],
    [
      '20x20x150 tower',
      shape(12800, 60000, { x: 20, y: 20, z: 150 }),
      { fast: 7080, standard: 7902, quality: 12963 },
    ],
    [
      '120x120x3 plate',
      shape(30240, 43200, { x: 120, y: 120, z: 3 }),
      { fast: 4757, standard: 4935, quality: 6390 },
    ],
  ]

  test.each(REAL_SLICES)('stays within 35%% of a real slice of a %s', (_name, analysis, actual) => {
    for (const preset of ['fast', 'standard', 'quality'] as const) {
      const predicted = estimate(request(analysis, preset)).estimatedSeconds
      const error = Math.abs(predicted - actual[preset]) / actual[preset]
      expect(error, `${preset}: predicted ${predicted}s vs ${actual[preset]}s`).toBeLessThan(0.35)
    }
  })

  test('a taller model takes longer than a shorter one at equal volume share', () => {
    const small = estimate(request(cube(20), 'standard')).estimatedSeconds
    const large = estimate(request(cube(60), 'standard')).estimatedSeconds
    expect(large).toBeGreaterThan(small)
  })
})
