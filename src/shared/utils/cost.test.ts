import { describe, expect, test } from 'vitest'
import { filamentCost, formatCost, formatGrams, formatLength } from './cost.js'

describe('filamentCost', () => {
  test('50 g of a 20 EUR/kg spool costs 1.00', () => {
    expect(filamentCost(50, 20)).toBeCloseTo(1)
    expect(formatCost(filamentCost(50, 20))).toBe('€1.00')
  })

  test('scales linearly with weight and price', () => {
    expect(filamentCost(43, 20)).toBeCloseTo(0.86)
    expect(filamentCost(1000, 25)).toBeCloseTo(25)
  })

  test('degrades to zero rather than NaN on bad input', () => {
    expect(filamentCost(Number.NaN, 20)).toBe(0)
  })
})

describe('formatters', () => {
  test('grams keep a decimal only when small', () => {
    expect(formatGrams(5.48)).toBe('5.5 g')
    expect(formatGrams(43.2)).toBe('43 g')
  })

  test('length is shown in metres', () => {
    expect(formatLength(1336.29)).toBe('1.34 m')
    expect(formatLength(14500)).toBe('14.5 m')
  })
})
