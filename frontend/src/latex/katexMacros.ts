/**
 * Shared KaTeX macros parsed from custom preamble.
 *
 * This is a mutable object passed by reference to every katex.render() call
 * so that custom commands like \impl, \non, \N, \Z etc. render correctly
 * in the editor previews.
 */

/**
 * Default macros for common shorthand commands.
 * These ensure previews work out of the box even without a custom preamble.
 * Kept in sync with SHORTHAND_COMMANDS in generateLatex.ts.
 */
const DEFAULT_KATEX_MACROS: Record<string, string> = {
  // Number sets
  '\\N': '\\mathbb{N}',
  '\\Z': '\\mathbb{Z}',
  '\\Q': '\\mathbb{Q}',
  '\\R': '\\mathbb{R}',
  '\\C': '\\mathbb{C}',
  '\\F': '\\mathbb{F}',
  '\\K': '\\mathbb{K}',
  '\\P': '\\mathbb{P}',
  // Common operators
  '\\abs': '\\left|#1\\right|',
  '\\norm': '\\left\\|#1\\right\\|',
  '\\ceil': '\\left\\lceil#1\\right\\rceil',
  '\\floor': '\\left\\lfloor#1\\right\\rfloor',
  '\\inner': '\\left\\langle#1,#2\\right\\rangle',
  // Differential/calculus
  '\\dd': '\\,\\mathrm{d}',
  '\\dv': '\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}',
  '\\pdv': '\\frac{\\partial#1}{\\partial#2}',
  // Set theory
  '\\powerset': '\\mathcal{P}',
  // Linear algebra
  '\\tr': '\\operatorname{tr}',
  '\\rank': '\\operatorname{rank}',
  '\\diag': '\\operatorname{diag}',
  '\\sgn': '\\operatorname{sgn}',
  '\\id': '\\operatorname{id}',
  '\\im': '\\operatorname{im}',
}

export const katexMacros: Record<string, string> = { ...DEFAULT_KATEX_MACROS }

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
    if (s[i] === '\\') {
      i++ // skip next char (handles \\ and \{ \})
      continue
    }
    if (s[i] === '{') depth++
    if (s[i] === '}') depth--
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
  // Restore defaults, then overlay user-defined macros (which take precedence)
  Object.assign(katexMacros, DEFAULT_KATEX_MACROS)
  const parsed = parsePreambleMacros(preamble)
  Object.assign(katexMacros, parsed)
}
