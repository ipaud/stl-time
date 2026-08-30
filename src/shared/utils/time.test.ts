import { describe, expect, test } from 'vitest'
import { formatDuration, parseSlicerDuration } from './time.js'

describe('formatDuration', () => {
  test('renders sub-hour durations in minutes', () => {
    expect(formatDuration(2520)).toBe('42 min')
    expect(formatDuration(60)).toBe('1 min')
  })

  test('renders hours with zero-padded minutes', () => {
    expect(formatDuration(3900)).toBe('1 h 05 min')
    expect(formatDuration(4 * 3600 + 32 * 60)).toBe('4 h 32 min')
    expect(formatDuration(12 * 3600 + 5 * 60)).toBe('12 h 05 min')
  })

  test('switches to days past 24 hours', () => {
    expect(formatDuration(98700)).toBe('1 d 03 h')
  })

  test('stays in hours right up to the day boundary', () => {
    expect(formatDuration(24 * 3600 - 60)).toBe('23 h 59 min')
  })

  test('rolls a rounded-up 24th hour into the day count', () => {
    // 1 d 23 h 40 min: the hour remainder rounds to 24, which must become 2 d.
    expect(formatDuration(86400 + 23.67 * 3600)).toBe('2 d 00 h')
  })

  test('never shows a bare zero or a negative', () => {
    expect(formatDuration(10)).toBe('< 1 min')
    expect(formatDuration(-5)).toBe('—')
    expect(formatDuration(Number.NaN)).toBe('—')
  })
})

describe('parseSlicerDuration', () => {
  test('parses the header format OrcaSlicer emits', () => {
    expect(parseSlicerDuration('19m 18s')).toBe(19 * 60 + 18)
    expect(parseSlicerDuration('1h 4m 30s')).toBe(3600 + 4 * 60 + 30)
    expect(parseSlicerDuration('2d 3h 1m 6s')).toBe(2 * 86400 + 3 * 3600 + 66)
    expect(parseSlicerDuration('45s')).toBe(45)
  })

  test('returns null when there is nothing to parse', () => {
    expect(parseSlicerDuration('unknown')).toBeNull()
    expect(parseSlicerDuration('')).toBeNull()
  })
})
