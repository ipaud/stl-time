import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { PLA } from '@shared/printers/adventurer5mpro.js'
import { estimateWeightGrams, parseGcodeMetadata, readGcodeHeader } from '../gcode/parse.js'
import { log } from '../log.js'
import { detectSlicer, type SlicerInstallation } from './detect.js'
import type { SliceRequest, SliceResult, SlicerEngine } from './engine.js'

/** A single plate never takes minutes; anything longer is a stuck process. */
const SLICE_TIMEOUT_MS = 180_000

/** `--slice 0` writes one file per plate; we only ever have plate 1. */
const PLATE_GCODE = 'plate_1.gcode'

export class OrcaSlicerEngine implements SlicerEngine {
  readonly id = 'orca'

  async available(): Promise<boolean> {
    return (await detectSlicer()) !== null
  }

  async info(): Promise<SlicerInstallation | null> {
    return detectSlicer()
  }

  async slice(request: SliceRequest): Promise<SliceResult> {
    const install = await detectSlicer()
    if (!install) throw new Error('No slicer installed')

    const { profilesDir } = install
    const machineJson = join(profilesDir, 'machine', request.printer.machinePreset)
    const processJson = join(profilesDir, 'process', request.profile.processPreset)
    const filamentJson = join(profilesDir, 'filament', request.printer.filamentPreset)

    const args = [
      // Orca joins multiple setting files with ';' — machine first, then process.
      '--load-settings',
      `${machineJson};${processJson}`,
      '--load-filaments',
      filamentJson,
      // FlashForge's PLA preset ships density 0, which zeroes the weight line.
      '--filament-density',
      String(PLA.density),
      // Drop the model onto the bed and let the slicer place it there. Without
      // arrange, an STL authored away from the origin lands off the bed and is
      // rejected even when it comfortably fits; placement moves the estimate by
      // well under 1%. Orientation is never touched — the model is sliced as
      // authored.
      '--ensure-on-bed',
      '--arrange',
      '1',
      '--orient',
      '0',
      '--slice',
      '0',
      '--outputdir',
      request.outputDir,
      request.inputPath,
    ]

    // Orca refuses to write into a directory that does not already exist.
    await mkdir(request.outputDir, { recursive: true })

    const output = await runSlicer(install.binPath, args, request.signal)

    // The CLI exits 0 even when it fails, so the G-code it wrote is the only
    // trustworthy success signal; its console output is kept for the message.
    let header: string
    try {
      header = await readGcodeHeader(join(request.outputDir, PLATE_GCODE))
    } catch {
      throw new Error(`Slicer produced no G-code${output ? `: ${trim(output)}` : ''}`)
    }

    const metadata = parseGcodeMetadata(header)

    if (metadata.estimatedSeconds === null) {
      throw new Error('Slicer produced G-code without a time estimate')
    }

    const weight = estimateWeightGrams(metadata, PLA.density)

    return {
      estimatedSeconds: metadata.estimatedSeconds,
      ...(metadata.filamentLengthMm !== null
        ? { filamentLengthMm: metadata.filamentLengthMm }
        : {}),
      ...(weight !== null ? { filamentWeightGrams: weight } : {}),
      approximate: false,
    }
  }
}

/** Resolves with whatever the process printed; rejects only if it never ran. */
function runSlicer(binPath: string, args: readonly string[], signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('cancelled'))
      return
    }

    // Arguments are passed as an array; nothing is ever interpolated into a shell.
    const child = spawn(binPath, [...args], { stdio: ['ignore', 'pipe', 'pipe'] })

    // The CLI can print a load/slice failure and still exit 0, so its output is
    // kept for the error message and success is judged by the G-code it wrote.
    let output = ''
    let settled = false

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      if (error) reject(error)
      else resolve(output)
    }

    const kill = () => {
      if (!child.killed) child.kill('SIGTERM')
    }

    const onAbort = () => {
      kill()
      finish(new Error('cancelled'))
    }

    const timer = setTimeout(() => {
      kill()
      finish(new Error('Slicing timed out'))
    }, SLICE_TIMEOUT_MS)

    signal.addEventListener('abort', onAbort, { once: true })

    // Bounded so a chatty slicer cannot grow the buffer without limit.
    const collect = (chunk: Buffer): void => {
      if (output.length < 8000) output += chunk.toString()
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)

    child.on('error', (error) => finish(error))
    child.on('close', () => finish())
  })
}

/** Last non-empty line of the slicer's output, short enough for one log line. */
const trim = (text: string): string => {
  const line = text.trim().split('\n').filter(Boolean).pop() ?? ''
  return line.slice(0, 200)
}

export const orcaEngine = new OrcaSlicerEngine()

export async function logSlicerStartup(): Promise<void> {
  const install = await detectSlicer()
  if (install) log('orca', `ready: ${install.name} ${install.version}`)
}
