import { describe, expect, test } from 'vitest'
import type { JobEvent } from '@shared/ipc.js'
import { initialState, reducer, type AppState } from './state.js'

const estimating: AppState = { ...initialState, status: 'estimating', jobId: 'job-a' }

const presetDone = (jobId: string, seconds: number): JobEvent => ({
  jobId,
  kind: 'preset',
  preset: 'standard',
  progress: 'done',
  estimate: {
    preset: 'standard',
    estimatedSeconds: seconds,
    approximate: false,
    source: 'slicer',
  },
})

describe('reducer', () => {
  test('accepts results from the active job', () => {
    const next = reducer(estimating, { type: 'job-event', event: presetDone('job-a', 1158) })
    expect(next.presets.standard?.estimate?.estimatedSeconds).toBe(1158)
  })

  test('ignores results from a job the user already replaced', () => {
    const next = reducer(estimating, { type: 'job-event', event: presetDone('job-old', 9999) })
    expect(next).toBe(estimating)
    expect(next.presets.standard?.estimate).toBeUndefined()
  })

  test('loading a new file clears the previous model and its estimates', () => {
    const withResult = reducer(estimating, { type: 'job-event', event: presetDone('job-a', 1158) })
    const next = reducer(withResult, { type: 'loading', filename: 'other.stl' })

    expect(next.analysis).toBeNull()
    expect(next.geometry).toBeNull()
    expect(next.jobId).toBeNull()
    expect(next.presets.standard?.progress).toBe('pending')
    expect(next.presets.standard?.estimate).toBeUndefined()
  })

  test('keeps the selected preset across a reload', () => {
    const selected = reducer(estimating, { type: 'select', preset: 'quality' })
    const next = reducer(selected, { type: 'loading', filename: 'other.stl' })
    expect(next.selected).toBe('quality')
  })

  test('marks the job ready when it finishes', () => {
    const next = reducer(estimating, { type: 'job-event', event: { jobId: 'job-a', kind: 'done' } })
    expect(next.status).toBe('ready')
  })
})
