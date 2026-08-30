import { describe, expect, test } from 'vitest'
import { ADVENTURER_5M_PRO } from '../printers/adventurer5mpro.js'
import { checkFit } from './fit.js'

const fit = (x: number, y: number, z: number) => checkFit({ x, y, z }, ADVENTURER_5M_PRO)

describe('checkFit', () => {
  test('accepts models inside the build volume', () => {
    expect(fit(100, 100, 100).fits).toBe(true)
  })

  test('accepts a model exactly at the limit', () => {
    expect(fit(220, 220, 220).fits).toBe(true)
  })

  test('rejects a model over on one axis and names it', () => {
    const result = fit(221, 200, 200)
    expect(result.fits).toBe(false)
    expect(result.exceeded).toHaveLength(1)
    expect(result.exceeded[0]).toEqual({ axis: 'x', modelMm: 221, limitMm: 220 })
  })

  test('reports the worst overflow first', () => {
    const result = fit(230, 200, 300)
    expect(result.exceeded.map((e) => e.axis)).toEqual(['z', 'x'])
  })
})
