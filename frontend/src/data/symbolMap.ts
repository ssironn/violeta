export interface SymbolEntry {
  latex: string
  display: string
}

export interface SymbolGroup {
  label: string
  symbols: SymbolEntry[]
}

export const symbolGroups: SymbolGroup[] = [
  {
    label: 'Operadores',
    symbols: [
      { latex: '+', display: '+' },
      { latex: '-', display: '-' },
      { latex: '\\times', display: '\\times' },
      { latex: '\\div', display: '\\div' },
      { latex: '\\pm', display: '\\pm' },
      { latex: '\\neq', display: '\\neq' },
      { latex: '\\leq', display: '\\leq' },
      { latex: '\\geq', display: '\\geq' },
      { latex: '\\approx', display: '\\approx' },
      { latex: '\\equiv', display: '\\equiv' },
      { latex: '\\sim', display: '\\sim' },
      { latex: '\\propto', display: '\\propto' },
    ],
  },
  {
    label: 'Gregos',
    symbols: [
      { latex: '\\alpha', display: '\\alpha' },
      { latex: '\\beta', display: '\\beta' },
      { latex: '\\gamma', display: '\\gamma' },
      { latex: '\\delta', display: '\\delta' },
      { latex: '\\epsilon', display: '\\epsilon' },
      { latex: '\\theta', display: '\\theta' },
      { latex: '\\lambda', display: '\\lambda' },
      { latex: '\\mu', display: '\\mu' },
      { latex: '\\pi', display: '\\pi' },
      { latex: '\\sigma', display: '\\sigma' },
      { latex: '\\phi', display: '\\phi' },
      { latex: '\\omega', display: '\\omega' },
      { latex: '\\Delta', display: '\\Delta' },
      { latex: '\\Sigma', display: '\\Sigma' },
      { latex: '\\Omega', display: '\\Omega' },
      { latex: '\\Phi', display: '\\Phi' },
    ],
  },
  {
    label: 'Setas',
    symbols: [
      { latex: '\\rightarrow', display: '\\rightarrow' },
      { latex: '\\leftarrow', display: '\\leftarrow' },
      { latex: '\\Rightarrow', display: '\\Rightarrow' },
      { latex: '\\Leftarrow', display: '\\Leftarrow' },
      { latex: '\\leftrightarrow', display: '\\leftrightarrow' },
      { latex: '\\Leftrightarrow', display: '\\Leftrightarrow' },
      { latex: '\\mapsto', display: '\\mapsto' },
    ],
  },
  {
    label: 'Conjuntos',
    symbols: [
      { latex: '\\in', display: '\\in' },
      { latex: '\\notin', display: '\\notin' },
      { latex: '\\subset', display: '\\subset' },
      { latex: '\\supset', display: '\\supset' },
      { latex: '\\cup', display: '\\cup' },
      { latex: '\\cap', display: '\\cap' },
      { latex: '\\emptyset', display: '\\emptyset' },
      { latex: '\\forall', display: '\\forall' },
      { latex: '\\exists', display: '\\exists' },
      { latex: '\\infty', display: '\\infty' },
      { latex: '\\mathbb{R}', display: '\\mathbb{R}' },
      { latex: '\\mathbb{N}', display: '\\mathbb{N}' },
    ],
  },
  {
    label: 'Estruturas',
    symbols: [
      { latex: '\\frac{a}{b}', display: '\\frac{a}{b}' },
      { latex: '\\sqrt{x}', display: '\\sqrt{x}' },
      { latex: '\\sqrt[n]{x}', display: '\\sqrt[n]{x}' },
      { latex: 'x^{n}', display: 'x^n' },
      { latex: 'x_{i}', display: 'x_i' },
      { latex: '\\displaystyle\\int_{a}^{b} f(x)\\,dx', display: '\\int_a^b' },
      { latex: '\\displaystyle\\sum_{i=1}^{n} a_i', display: '\\sum_{i=1}^n' },
      { latex: '\\displaystyle\\prod_{i=1}^{n} a_i', display: '\\prod_{i=1}^n' },
      { latex: '\\displaystyle\\lim_{x \\to \\infty} f(x)', display: '\\lim_{x\\to\\infty}' },
      { latex: '\\frac{d}{dx} f(x)', display: '\\frac{d}{dx}' },
      { latex: '\\frac{\\partial f}{\\partial x}', display: '\\frac{\\partial}{\\partial x}' },
      { latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', display: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}' },
    ],
  },
]

/**
 * Reverse lookup: symbol name (without backslash) → LaTeX command.
 * e.g. "alpha" → "\\alpha", "rightarrow" → "\\rightarrow"
 * Only includes simple commands (single backslash + name), not structures.
 */
export const symbolNameToLatex: Record<string, string> = {}

for (const group of symbolGroups) {
  for (const s of group.symbols) {
    // Match simple \commandName patterns
    const match = s.latex.match(/^\\([a-zA-Z]+)$/)
    if (match) {
      symbolNameToLatex[match[1].toLowerCase()] = s.latex
    }
  }
}

/**
 * Search for symbols whose name contains the query string.
 * Returns array of { name, latex, display } for suggestions.
 */
export function searchSymbols(query: string): { name: string; latex: string; display: string }[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  const results: { name: string; latex: string; display: string }[] = []

  for (const group of symbolGroups) {
    for (const s of group.symbols) {
      const match = s.latex.match(/^\\([a-zA-Z]+)$/)
      if (match) {
        const name = match[1].toLowerCase()
        if (name.includes(q)) {
          results.push({ name: match[1], latex: s.latex, display: s.display })
        }
      }
    }
  }

  return results
}
