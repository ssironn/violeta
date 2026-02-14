/**
 * Shared KaTeX macros parsed from custom preamble.
 *
 * This is a mutable object passed by reference to every katex.render() call
 * so that custom commands like \impl, \non, \N, \Z etc. render correctly
 * in the editor previews.
 */

export const katexMacros: Record<string, string> = {}

/**
 * Parse \newcommand, \renewcommand, \def, and \DeclareMathOperator
 * definitions from a LaTeX preamble string into a KaTeX-compatible
 * macros record.
 */
export function parsePreambleMacros(preamble: string): Record<string, string> {
  const macros: Record<string, string> = {}
  if (!preamble) return macros

  // Match \newcommand{\foo}[n]{body} or \newcommand\foo[n]{body}
  // Also \renewcommand
  const newcmdRe = /\\(?:re)?newcommand\*?\s*\{?(\\[a-zA-Z]+)\}?\s*(?:\[\d+\])?\s*\{/g
  let match: RegExpExecArray | null
  while ((match = newcmdRe.exec(preamble)) !== null) {
    const name = match[1]
    const bodyStart = match.index + match[0].length - 1 // position of opening {
    const bodyEnd = findMatchingBrace(preamble, bodyStart)
    if (bodyEnd > bodyStart) {
      macros[name] = preamble.slice(bodyStart + 1, bodyEnd)
    }
  }

  // Match \def\foo{body}
  const defRe = /\\def\s*(\\[a-zA-Z]+)\s*(?:#\d)*\s*\{/g
  while ((match = defRe.exec(preamble)) !== null) {
    const name = match[1]
    const bodyStart = preamble.indexOf('{', match.index + match[0].length - 1)
    if (bodyStart === -1) continue
    const bodyEnd = findMatchingBrace(preamble, bodyStart)
    if (bodyEnd > bodyStart) {
      macros[name] = preamble.slice(bodyStart + 1, bodyEnd)
    }
  }

  // Match \DeclareMathOperator{\foo}{body} or \DeclareMathOperator*{\foo}{body}
  const declareRe = /\\DeclareMathOperator\*?\s*\{(\\[a-zA-Z]+)\}\s*\{/g
  while ((match = declareRe.exec(preamble)) !== null) {
    const name = match[1]
    const bodyStart = preamble.indexOf('{', match.index + match[0].length - 1)
    if (bodyStart === -1) continue
    const bodyEnd = findMatchingBrace(preamble, bodyStart)
    if (bodyEnd > bodyStart) {
      const opName = preamble.slice(bodyStart + 1, bodyEnd)
      const star = match[0].includes('*') ? '*' : ''
      macros[name] = `\\operatorname${star}{${opName}}`
    }
  }

  return macros
}

function findMatchingBrace(s: string, start: number): number {
  let depth = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{' && (i === 0 || s[i - 1] !== '\\')) depth++
    if (s[i] === '}' && (i === 0 || s[i - 1] !== '\\')) depth--
    if (depth === 0) return i
  }
  return -1
}

/**
 * Update the shared katexMacros object in-place.
 * All KaTeX render calls that reference this object will pick up the changes.
 */
export function updateKatexMacros(preamble: string): void {
  // Clear existing entries
  for (const key of Object.keys(katexMacros)) {
    delete katexMacros[key]
  }
  // Parse and populate
  const parsed = parsePreambleMacros(preamble)
  Object.assign(katexMacros, parsed)
}
