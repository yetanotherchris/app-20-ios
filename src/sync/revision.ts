import { parseConversationSafe, type Conversation } from '../storage/schema'

export interface Instant {
  seconds: number
  fraction: string
}

/** Strict calendar validation, with arbitrary decimal precision kept for ordering. */
export function instant(value: string): Instant | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return null
  const [, y, mo, d, h, mi, s, fraction = '', zone = ''] = match
  const year = Number(y),
    month = Number(mo),
    day = Number(d)
  const hour = Number(h),
    minute = Number(mi),
    second = Number(s)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0) || hour > 23 || minute > 59 || second > 59)
    return null
  const zh = /^[Zz]$/.test(zone) ? 0 : Number(zone.slice(1, 3))
  const zm = /^[Zz]$/.test(zone) ? 0 : Number(zone.slice(4))
  if (zh > 23 || zm > 59) return null
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, 0)
  const offset = (zh * 60 + zm) * (zone.startsWith('-') ? -1 : 1)
  return { seconds: date.getTime() / 1000 - offset * 60, fraction: fraction.replace(/0+$/, '') }
}

export function compareInstants(a: Instant, b: Instant): number {
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1
  const width = Math.max(a.fraction.length, b.fraction.length)
  const af = a.fraction.padEnd(width, '0'),
    bf = b.fraction.padEnd(width, '0')
  return af === bf ? 0 : af < bf ? -1 : 1
}

export function revision(raw: string | null): Conversation | null {
  const parsed = raw === null ? null : parseConversationSafe(raw)
  return parsed && instant(parsed.updatedAt) ? parsed : null
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, ordered(v)]),
    )
  return value
}

export function equivalent(a: string | null, b: string | null, ignoreTime = false): boolean {
  if (a === b) return true
  const left = revision(a),
    right = revision(b)
  if (!left || !right) return false
  const normalize = (c: Conversation) => ordered({ ...c, updatedAt: ignoreTime ? '' : instant(c.updatedAt) })
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
}

/** A canonical millisecond instant strictly later than every valid competitor. */
export function freshTimestamp(...values: string[]): string {
  let ms = Date.now()
  for (const value of values) {
    const time = instant(value)
    if (time) ms = Math.max(ms, time.seconds * 1000 + Number(time.fraction.slice(0, 3).padEnd(3, '0')) + 1)
  }
  return new Date(ms).toISOString()
}
