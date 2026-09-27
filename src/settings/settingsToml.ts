import { parse, stringify } from 'smol-toml'

/** smol-toml also accepts 1.1. Reject its additions before parsing as 1.0. */
function requireToml10(source: string): void {
  let quote = ''
  let multiline = false
  let inlineDepth = 0
  let previous = ''
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!
    if (quote) {
      if (quote === '"' && char === '\\') {
        if (source[i + 1] === 'e' || source[i + 1] === 'x') throw new Error('Invalid TOML 1.0')
        i += 1
        continue
      }
      if (char === quote) {
        if (!multiline || source.slice(i, i + 3) === quote.repeat(3)) {
          if (multiline) {
            // Four/five closing quotes include one/two literal quotes in the value.
            let closing = 3
            while (closing < 5 && source[i + closing] === quote) closing += 1
            i += closing - 1
          }
          quote = ''
          multiline = false
        }
      }
      continue
    }
    if (char === '#') {
      while (i < source.length && source[i] !== '\n' && source[i] !== '\r') i += 1
      if (inlineDepth && i < source.length) throw new Error('Invalid TOML 1.0')
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      multiline = source.slice(i, i + 3) === char.repeat(3)
      if (multiline) i += 2
      previous = 'value'
      continue
    }
    if (char === '{') inlineDepth += 1
    if (inlineDepth && (char === '\n' || char === '\r')) throw new Error('Invalid TOML 1.0')
    if (char === '}') {
      if (previous === ',') throw new Error('Invalid TOML 1.0')
      inlineDepth -= 1
    }
    if (!/\s/.test(char)) previous = char
  }
}

export function parseSettingsToml(source: string): Record<string, unknown> {
  requireToml10(source)
  return parse(source, { maxDepth: 16 })
}

export function serializeSettingsToml(value: Record<string, unknown>): string {
  return stringify(value)
}
