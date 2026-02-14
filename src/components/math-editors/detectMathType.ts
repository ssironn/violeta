export type MathType =
  | 'fraction'
  | 'integral'
  | 'doubleintegral'
  | 'sum'
  | 'product'
  | 'limit'
  | 'sqrt'
  | 'nthroot'
  | 'superscript'
  | 'subscript'
  | 'matrix'
  | 'derivative'
  | 'partial'
  | 'generic'

// ─── Brace-aware extraction ───────────────────────────────────────

/** Find matching closing brace for the one at `start`. Returns the index of `}`. */
function findClosingBrace(s: string, start: number): number {
  let depth = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{' && s[i - 1] !== '\\') depth++
    if (s[i] === '}' && s[i - 1] !== '\\') depth--
    if (depth === 0) return i
  }
  return s.length - 1
}

/** Extract the content of the first `{...}` group starting at or after `pos`. */
function extractBraceGroup(s: string, pos: number): { content: string; end: number } {
  const open = s.indexOf('{', pos)
  if (open === -1) return { content: '', end: pos }
  const close = findClosingBrace(s, open)
  return { content: s.slice(open + 1, close), end: close + 1 }
}

// ─── Parsers ──────────────────────────────────────────────────────

export interface FractionFields { numerator: string; denominator: string }
export function parseFraction(latex: string): FractionFields {
  const i = latex.indexOf('\\frac')
  if (i === -1) return { numerator: '', denominator: '' }
  const num = extractBraceGroup(latex, i + 5)
  const den = extractBraceGroup(latex, num.end)
  return { numerator: num.content, denominator: den.content }
}
export function buildFraction(f: FractionFields): string {
  return `\\frac{${f.numerator}}{${f.denominator}}`
}

export interface IntegralFields { lower: string; upper: string; integrand: string; variable: string }
export function parseIntegral(latex: string): IntegralFields {
  const m = latex.match(/\\int_\{([^}]*)\}\^\{([^}]*)\}\s*(.+?)\s*\\[,;!]\s*d(\w+)\s*$/)
  if (m) return { lower: m[1], upper: m[2], integrand: m[3], variable: m[4] }
  const m2 = latex.match(/\\int_\{([^}]*)\}\^\{([^}]*)\}\s*(.+?)\s*d(\w+)\s*$/)
  if (m2) return { lower: m2[1], upper: m2[2], integrand: m2[3], variable: m2[4] }
  return { lower: 'a', upper: 'b', integrand: 'f(x)', variable: 'x' }
}
export function buildIntegral(f: IntegralFields): string {
  return `\\int_{${f.lower}}^{${f.upper}} ${f.integrand} \\, d${f.variable}`
}

export interface DoubleIntegralFields { domain: string; integrand: string; area: string }
export function parseDoubleIntegral(latex: string): DoubleIntegralFields {
  const m = latex.match(/\\iint_\{([^}]*)\}\s*(.+?)\s*\\[,;!]\s*d(\w+)\s*$/)
  if (m) return { domain: m[1], integrand: m[2], area: m[3] }
  const m2 = latex.match(/\\iint_\{([^}]*)\}\s*(.+?)\s*d(\w+)\s*$/)
  if (m2) return { domain: m2[1], integrand: m2[2], area: m2[3] }
  return { domain: 'D', integrand: 'f(x,y)', area: 'A' }
}
export function buildDoubleIntegral(f: DoubleIntegralFields): string {
  return `\\iint_{${f.domain}} ${f.integrand} \\, d${f.area}`
}

export interface SumProductFields { variable: string; lower: string; upper: string; expression: string }
export function parseSumProduct(latex: string): SumProductFields {
  const m = latex.match(/\\(?:sum|prod)_\{(\w+)=([^}]*)\}\^\{([^}]*)\}\s*(.+)$/)
  if (m) return { variable: m[1], lower: m[2], upper: m[3], expression: m[4] }
  return { variable: 'i', lower: '1', upper: 'n', expression: 'a_i' }
}
export function buildSum(f: SumProductFields): string {
  return `\\sum_{${f.variable}=${f.lower}}^{${f.upper}} ${f.expression}`
}
export function buildProduct(f: SumProductFields): string {
  return `\\prod_{${f.variable}=${f.lower}}^{${f.upper}} ${f.expression}`
}

export interface LimitFields { variable: string; approaches: string; expression: string }
export function parseLimit(latex: string): LimitFields {
  const m = latex.match(/\\lim_\{(\w+)\s*\\to\s*([^}]*)\}\s*(.+)$/)
  if (m) return { variable: m[1], approaches: m[2], expression: m[3] }
  return { variable: 'x', approaches: '\\infty', expression: 'f(x)' }
}
export function buildLimit(f: LimitFields): string {
  return `\\lim_{${f.variable} \\to ${f.approaches}} ${f.expression}`
}

export interface RootFields { index: string; radicand: string }
export function parseRoot(latex: string): RootFields {
  const nthMatch = latex.match(/\\sqrt\[([^\]]*)\]/)
  if (nthMatch) {
    const idx = nthMatch[1]
    const rest = extractBraceGroup(latex, latex.indexOf(']') + 1)
    return { index: idx, radicand: rest.content }
  }
  const sqrtMatch = latex.match(/\\sqrt\{/)
  if (sqrtMatch) {
    const g = extractBraceGroup(latex, latex.indexOf('\\sqrt') + 5)
    return { index: '', radicand: g.content }
  }
  return { index: '', radicand: 'x' }
}
export function buildRoot(f: RootFields): string {
  if (f.index.trim()) return `\\sqrt[${f.index}]{${f.radicand}}`
  return `\\sqrt{${f.radicand}}`
}

export interface SuperscriptFields { base: string; exponent: string }
export function parseSuperscript(latex: string): SuperscriptFields {
  const m = latex.match(/^(.+?)\^\{([^}]*)\}/)
  if (m) return { base: m[1], exponent: m[2] }
  return { base: 'x', exponent: '2' }
}
export function buildSuperscript(f: SuperscriptFields): string {
  return `${f.base}^{${f.exponent}}`
}

export interface SubscriptFields { base: string; subscript: string }
export function parseSubscript(latex: string): SubscriptFields {
  const m = latex.match(/^(.+?)_\{([^}]*)\}/)
  if (m) return { base: m[1], subscript: m[2] }
  return { base: 'x', subscript: 'i' }
}
export function buildSubscript(f: SubscriptFields): string {
  return `${f.base}_{${f.subscript}}`
}

export interface DerivativeFields { func: string; variable: string; isPartial: boolean }
export function parseDerivative(latex: string): DerivativeFields {
  const isPartial = latex.includes('\\partial')
  const symbol = isPartial ? '\\\\partial' : 'd'
  const re = new RegExp(`\\\\frac\\{${symbol}(?:\\s*([^}]*))?\\}\\{${symbol}\\s*([^}]*)\\}\\s*(.*)$`)
  const m = latex.match(re)
  if (m) {
    return { func: (m[3] || m[1] || 'f(x)').trim(), variable: m[2].trim(), isPartial }
  }
  return { func: 'f(x)', variable: 'x', isPartial }
}
export function buildDerivative(f: DerivativeFields): string {
  const s = f.isPartial ? '\\partial' : 'd'
  return `\\frac{${s}}{${s}${f.variable}} ${f.func}`
}

export interface MatrixFields { rows: number; cols: number; cells: string[][] }
export function parseMatrix(latex: string): MatrixFields {
  const inner = latex.replace(/\\begin\{[a-z]*matrix\}/, '').replace(/\\end\{[a-z]*matrix\}/, '').trim()
  const rowStrs = inner.split('\\\\').map(r => r.trim()).filter(Boolean)
  const cells = rowStrs.map(r => r.split('&').map(c => c.trim()))
  const rows = cells.length || 2
  const cols = Math.max(...cells.map(r => r.length), 2)
  // Pad cells
  for (const row of cells) {
    while (row.length < cols) row.push('')
  }
  while (cells.length < rows) {
    cells.push(Array(cols).fill(''))
  }
  return { rows, cols, cells }
}
export function buildMatrix(f: MatrixFields): string {
  const body = f.cells
    .map(row => row.join(' & '))
    .join(' \\\\ ')
  return `\\begin{pmatrix} ${body} \\end{pmatrix}`
}

// ─── Detector ─────────────────────────────────────────────────────

export function detectMathType(latex: string): MathType {
  const s = latex.trim()
  if (/\\begin\{[a-z]*matrix\}/.test(s)) return 'matrix'
  if (/\\frac\{\\partial/.test(s)) return 'partial'
  if (/\\frac\{d\}/.test(s) || /\\frac\{d\s/.test(s)) return 'derivative'
  if (/\\frac\{/.test(s) && !/\\frac\{d/.test(s) && !/\\frac\{\\partial/.test(s)) return 'fraction'
  if (/\\iint/.test(s)) return 'doubleintegral'
  if (/\\int/.test(s)) return 'integral'
  if (/\\sum/.test(s)) return 'sum'
  if (/\\prod/.test(s)) return 'product'
  if (/\\lim/.test(s)) return 'limit'
  if (/\\sqrt\[/.test(s)) return 'nthroot'
  if (/\\sqrt/.test(s)) return 'sqrt'
  if (/\^\{/.test(s) && !/_\{/.test(s)) return 'superscript'
  if (/_\{/.test(s) && !/\^\{/.test(s)) return 'subscript'
  return 'generic'
}
