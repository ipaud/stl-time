const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * Human print durations. Never seconds, never decimal hours.
 *   2520   -> "42 min"
 *   3900   -> "1 h 05 min"
 *   98700  -> "1 d 03 h"
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'

  const total = Math.round(seconds)
  if (total < MINUTE) return '< 1 min'

  if (total >= DAY) {
    const days = Math.floor(total / DAY)
    const hours = Math.round((total % DAY) / HOUR)
    // Rounding can push us to 24 h; roll it into the day count.
    return hours === 24 ? `${days + 1} d 00 h` : `${days} d ${pad(hours)} h`
  }

  const minutesTotal = Math.round(total / MINUTE)
  if (minutesTotal < 60) return `${minutesTotal} min`

  const hours = Math.floor(minutesTotal / 60)
  const minutes = minutesTotal % 60
  return `${hours} h ${pad(minutes)} min`
}

/**
 * Parses the duration OrcaSlicer writes in its G-code header, e.g.
 * "19m 18s", "1h 4m 30s", "2d 3h 1m 6s".
 */
export function parseSlicerDuration(raw: string): number | null {
  const matches = raw.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gi)
  let seconds = 0
  let found = false

  for (const match of matches) {
    const value = Number(match[1])
    const unit = match[2]?.toLowerCase()
    if (!Number.isFinite(value) || !unit) continue
    found = true
    if (unit === 'd') seconds += value * DAY
    else if (unit === 'h') seconds += value * HOUR
    else if (unit === 'm') seconds += value * MINUTE
    else seconds += value
  }

  return found ? seconds : null
}
