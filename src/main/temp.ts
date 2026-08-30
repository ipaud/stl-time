import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { log } from './log.js'

const ROOT_NAME = 'stl-time'

const root = (): string => join(app.getPath('temp'), ROOT_NAME)

export async function createJobDir(jobId: string): Promise<string> {
  const dir = join(root(), `job-${jobId}`)
  await mkdir(dir, { recursive: true })
  return dir
}

export async function removeJobDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true }).catch(() => undefined)
}

/** Used on quit, where an awaited promise would not finish before exit. */
export function removeJobDirSync(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    /* the OS will reclaim it with the rest of the temp directory */
  }
}

export function newJobId(): string {
  return randomUUID()
}

/**
 * Wipes every job directory at startup. No job can be running yet — the single
 * instance lock guarantees this is the only copy of the app — so anything still
 * on disk is debris from a crash or a hard quit.
 */
export async function cleanupAllJobs(): Promise<void> {
  try {
    await rm(root(), { recursive: true, force: true })
    log('temp', 'cleared leftover job directories')
  } catch {
    /* nothing there, or not ours to delete */
  }
}
