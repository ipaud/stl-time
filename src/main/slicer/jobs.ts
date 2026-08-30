import { ADVENTURER_5M_PRO } from '@shared/printers/adventurer5mpro.js'
import { QUALITY_PROFILES } from '@shared/profiles/quality.js'
import type { JobEvent } from '@shared/ipc.js'
import type { ModelAnalysis, PrintEstimate } from '@shared/types.js'
import { log } from '../log.js'
import { createJobDir, newJobId, removeJobDir, removeJobDirSync } from '../temp.js'
import { detectSlicer } from './detect.js'
import { estimate as fallbackEstimate } from './fallback.js'
import { orcaEngine } from './orca.js'
import type { SliceRequest } from './engine.js'

type Emit = (event: JobEvent) => void

interface Job {
  readonly id: string
  readonly controller: AbortController
  readonly dir: string
}

/**
 * Exactly one job runs at a time. Loading a new STL aborts the previous one and
 * drops its temp directory, so a stale result can never reach the renderer:
 * every event carries its jobId and the renderer ignores foreign ids.
 */
let current: Job | null = null

export async function cancelCurrentJob(): Promise<void> {
  const job = take()
  if (!job) return
  await removeJobDir(job.dir)
}

/** Quit path: the app exits before any awaited cleanup could finish. */
export function cancelCurrentJobSync(): void {
  const job = take()
  if (job) removeJobDirSync(job.dir)
}

function take(): Job | null {
  const job = current
  if (!job) return null
  current = null
  job.controller.abort()
  log('job', `${short(job.id)} cancelled`)
  return job
}

export async function startJob(
  inputPath: string,
  analysis: ModelAnalysis,
  emit: Emit,
): Promise<string> {
  await cancelCurrentJob()

  const id = newJobId()
  const dir = await createJobDir(id)
  const job: Job = { id, controller: new AbortController(), dir }
  current = job

  log('job', `${short(id)} start ${analysis.filename} (${analysis.triangleCount} triangles)`)

  // Deliberately not awaited: the renderer gets the id immediately and results
  // stream in as each preset finishes.
  void run(job, inputPath, analysis, emit)

  return id
}

async function run(
  job: Job,
  inputPath: string,
  analysis: ModelAnalysis,
  emit: Emit,
): Promise<void> {
  const send = (event: JobEvent): void => {
    if (current?.id === job.id) emit(event)
  }

  // A model that overflows the bed is rejected by the slicer anyway, so we go
  // straight to the approximate model instead of failing three times over.
  const install = analysis.fitsPrinter ? await detectSlicer() : null
  send({ jobId: job.id, kind: 'status', message: install ? 'Preparing…' : 'Estimating…' })

  // Sequential on purpose: a slice of a real model takes seconds, and one child
  // process at a time keeps cancellation and cleanup trivial.
  for (const profile of QUALITY_PROFILES) {
    if (job.controller.signal.aborted) return

    send({ jobId: job.id, kind: 'preset', preset: profile.id, progress: 'processing' })

    const request: SliceRequest = {
      inputPath,
      outputDir: `${job.dir}/${profile.id}`,
      profile,
      printer: ADVENTURER_5M_PRO,
      analysis,
      signal: job.controller.signal,
    }

    const started = Date.now()
    let estimate: PrintEstimate

    try {
      if (!install) throw new Error('no slicer')
      const result = await orcaEngine.slice(request)
      estimate = { preset: profile.id, ...result, source: 'slicer' }
      log('job', `${short(job.id)} ${profile.id} sliced in ${Date.now() - started} ms`)
    } catch (error) {
      if (job.controller.signal.aborted) return

      const reason = error instanceof Error ? error.message : String(error)
      if (install) log('job', `${short(job.id)} ${profile.id} slicer failed: ${reason}`)

      estimate = {
        preset: profile.id,
        ...fallbackEstimate(request),
        source: 'fallback',
        ...(install ? { notice: "Couldn't slice this model." } : {}),
      }
    }

    send({ jobId: job.id, kind: 'preset', preset: profile.id, progress: 'done', estimate })
  }

  if (job.controller.signal.aborted) return
  send({ jobId: job.id, kind: 'done' })
  log('job', `${short(job.id)} finished`)
}

const short = (id: string): string => id.slice(0, 8)
