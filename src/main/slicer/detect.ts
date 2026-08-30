import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { ADVENTURER_5M_PRO } from '@shared/printers/adventurer5mpro.js'
import { QUALITY_PROFILES } from '@shared/profiles/quality.js'
import { log } from '../log.js'

const run = promisify(execFile)

export interface SlicerInstallation {
  /** Absolute path to the executable inside the .app bundle. */
  readonly binPath: string
  /** Directory holding machine/, process/ and filament/ for FlashForge. */
  readonly profilesDir: string
  readonly name: string
  readonly version: string
}

/**
 * OrcaSlicer ships under several names on macOS. FlashForge's own fork is
 * installed as "Flash Studio.app" with an executable called "Flash Studio", so
 * the binary name is read from the bundle rather than guessed.
 */
const BUNDLE_NAMES = [
  'Flash Studio.app',
  'Orca-Flashforge.app',
  'OrcaSlicer.app',
  'OrcaSlicer-Flashforge.app',
]

const bundleRoots = [join('/', 'Applications'), join(homedir(), 'Applications')]

/** User data dirs, used only if the bundle does not carry its own profiles. */
const DATA_DIR_NAMES = ['Orca-Flashforge', 'OrcaSlicer']

const exists = async (path: string, mode: number = constants.F_OK): Promise<boolean> => {
  try {
    await access(path, mode)
    return true
  } catch {
    return false
  }
}

async function bundleExecutable(bundlePath: string): Promise<string | null> {
  try {
    const plist = await readFile(join(bundlePath, 'Contents', 'Info.plist'), 'utf8')
    const match = plist.match(/<key>CFBundleExecutable<\/key>\s*<string>([^<]+)<\/string>/)
    if (!match?.[1]) return null
    const binPath = join(bundlePath, 'Contents', 'MacOS', match[1])
    return (await exists(binPath, constants.X_OK)) ? binPath : null
  } catch {
    return null
  }
}

/**
 * A profiles directory is only usable if it actually holds the Adventurer 5M
 * Pro machine preset and all three process presets we slice with.
 */
async function isUsableProfilesDir(dir: string): Promise<boolean> {
  const required = [
    join(dir, 'machine', ADVENTURER_5M_PRO.machinePreset),
    join(dir, 'filament', ADVENTURER_5M_PRO.filamentPreset),
    ...QUALITY_PROFILES.map((p) => join(dir, 'process', p.processPreset)),
  ]
  const found = await Promise.all(required.map((path) => exists(path)))
  return found.every(Boolean)
}

async function findProfilesDir(bundlePath: string): Promise<string | null> {
  const candidates = [
    join(bundlePath, 'Contents', 'Resources', 'profiles', 'Flashforge'),
    ...DATA_DIR_NAMES.map((name) =>
      join(homedir(), 'Library', 'Application Support', name, 'system', 'Flashforge'),
    ),
  ]
  for (const dir of candidates) {
    if (await isUsableProfilesDir(dir)) return dir
  }
  return null
}

/** First line of --help looks like "Orca-Flashforge-2.3.2:". */
async function probeVersion(binPath: string): Promise<string | null> {
  try {
    const { stdout } = await run(binPath, ['--help'], { timeout: 20_000, maxBuffer: 1024 * 1024 })
    const firstLine = stdout.split('\n', 1)[0] ?? ''
    const match = firstLine.match(/([A-Za-z][\w-]*?)-(\d+\.\d+\.\d+)/)
    return match ? `${match[1]} ${match[2]}` : firstLine.trim() || null
  } catch {
    return null
  }
}

// The promise is cached, not just its value, so concurrent callers at startup
// share a single probe instead of each spawning their own --help.
let cached: Promise<SlicerInstallation | null> | null = null

export function detectSlicer(): Promise<SlicerInstallation | null> {
  cached ??= probe()
  return cached
}

/** Test seam: forget the cached probe. */
export function resetSlicerCache(): void {
  cached = null
}

async function probe(): Promise<SlicerInstallation | null> {
  if (process.env['STL_TIME_NO_SLICER'] === '1') {
    log('slicer', 'detection disabled by STL_TIME_NO_SLICER')
    return null
  }

  for (const root of bundleRoots) {
    for (const name of BUNDLE_NAMES) {
      const bundlePath = join(root, name)
      if (!(await exists(bundlePath))) continue

      const binPath = await bundleExecutable(bundlePath)
      if (!binPath) continue

      const profilesDir = await findProfilesDir(bundlePath)
      if (!profilesDir) {
        log('slicer', `${name}: no Adventurer 5M Pro presets, skipping`)
        continue
      }

      const version = (await probeVersion(binPath)) ?? 'unknown'
      log('slicer', `detected ${binPath}`)
      log('slicer', `version ${version}`)
      log('slicer', `profiles ${profilesDir}`)

      return { binPath, profilesDir, name: name.replace(/\.app$/, ''), version }
    }
  }

  log('slicer', 'not found; falling back to approximate estimates')
  return null
}
