import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types.js'

const MIN_PRICE = 0
const MAX_PRICE = 1000

const file = (): string => join(app.getPath('userData'), 'settings.json')

let cache: AppSettings | null = null

export async function getSettings(): Promise<AppSettings> {
  if (cache) return cache
  try {
    const raw = JSON.parse(await readFile(file(), 'utf8')) as unknown
    cache = sanitize(raw)
  } catch {
    cache = DEFAULT_SETTINGS
  }
  return cache
}

export async function setSettings(input: unknown): Promise<AppSettings> {
  const next = sanitize(input)
  cache = next
  await writeFile(file(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

/** Anything reaching this from the renderer is untrusted, so clamp it. */
function sanitize(input: unknown): AppSettings {
  const record =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const price = Number(record['plaPricePerKg'])
  return {
    plaPricePerKg: Number.isFinite(price)
      ? Math.min(MAX_PRICE, Math.max(MIN_PRICE, price))
      : DEFAULT_SETTINGS.plaPricePerKg,
  }
}
