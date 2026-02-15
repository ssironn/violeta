import type { JSONContent } from '@tiptap/core'

/**
 * Map Unicode math symbols to their LaTeX command equivalents.
 * pdflatex cannot handle raw Unicode in math mode.
 */
const UNICODE_MATH_MAP: Record<string, string> = {
  // Greek lowercase
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\varepsilon', 'ϵ': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta',
  'θ': '\\theta', 'ϑ': '\\vartheta', 'ι': '\\iota', 'κ': '\\kappa',
  'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi',
  'π': '\\pi', 'ρ': '\\rho', 'ϱ': '\\varrho', 'σ': '\\sigma',
  'ς': '\\varsigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\varphi',
  'ϕ': '\\phi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  // Greek uppercase
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
  'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon',
  'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  // Common math symbols
  '∞': '\\infty', '∂': '\\partial', '∇': '\\nabla',
  '±': '\\pm', '∓': '\\mp', '×': '\\times', '÷': '\\div',
  '·': '\\cdot', '∘': '\\circ', '⊗': '\\otimes', '⊕': '\\oplus',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '≡': '\\equiv', '∝': '\\propto', '≪': '\\ll', '≫': '\\gg',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∈': '\\in', '∉': '\\notin', '∅': '\\emptyset',
  '∪': '\\cup', '∩': '\\cap',
  '∧': '\\wedge', '∨': '\\vee', '¬': '\\neg',
  '→': '\\to', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '↦': '\\mapsto',
  '∀': '\\forall', '∃': '\\exists',
  '∫': '\\int', '∑': '\\sum', '∏': '\\prod',
  '√': '\\sqrt', '†': '\\dagger', '‡': '\\ddagger',
  '…': '\\ldots', '⋯': '\\cdots', '⋮': '\\vdots', '⋱': '\\ddots',
  'ℕ': '\\mathbb{N}', 'ℤ': '\\mathbb{Z}', 'ℚ': '\\mathbb{Q}',
  'ℝ': '\\mathbb{R}', 'ℂ': '\\mathbb{C}',
}

const unicodeMathRegex = new RegExp(
  '[' + Object.keys(UNICODE_MATH_MAP).join('') + ']',
  'g',
)

function sanitizeMathUnicode(latex: string): string {
  return latex.replace(unicodeMathRegex, (ch) => UNICODE_MATH_MAP[ch] ?? ch)
}

function escapeLatex(text: string): string {
  // Escape special LaTeX characters in text content.
  // We intentionally do NOT escape \ because text nodes may contain
  // LaTeX commands (\;, \delta, etc.) from math environments, and
  // converting \ → \textbackslash{} corrupts them.
  return text
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/([#$%&_{}])/g, '\\$1')
}

function processMarks(text: string, marks?: JSONContent['marks']): string {
  if (!marks || marks.length === 0) return text

  let result = text
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `\\textbf{${result}}`
        break
      case 'italic':
        result = `\\textit{${result}}`
        break
      case 'underline':
        result = `\\underline{${result}}`
        break
      case 'code':
        result = `\\texttt{${result}}`
        break
      case 'link':
        result = `\\href{${mark.attrs?.href ?? ''}}{${result}}`
        break
      case 'textStyle':
        if (mark.attrs?.color) {
          // Skip color in basic LaTeX for simplicity
        }
        break
    }
  }
  return result
}

function processInlineContent(node: JSONContent, escapeText = false): string {
  if (!node.content) return ''

  return node.content
    .map((child) => {
      if (child.type === 'text') {
        const text = escapeText ? escapeLatex(child.text ?? '') : (child.text ?? '')
        return processMarks(text, child.marks)
      }
      if (child.type === 'inlineMath') {
        // Collapse newlines to spaces so inline math stays on one line.
        // This prevents splitIntoBlocks from breaking $...$ across paragraphs
        // when the math content contains \\ followed by newlines (e.g. matrices).
        const inlineLatex = sanitizeMathUnicode(child.attrs?.latex ?? '').replace(/\n/g, ' ')
        return `$${inlineLatex}$`
      }
      if (child.type === 'latexSpacing') {
        return child.attrs?.command ?? '\\quad'
      }
      if (child.type === 'hardBreak') {
        return ' \\\\\n'
      }
      if (child.type === 'rawLatex') {
        return child.attrs?.content ?? ''
      }
      return ''
    })
    .join('')
}

function getAlignment(node: JSONContent): string | null {
  const align = node.attrs?.textAlign
  if (!align || align === 'left') return null
  return align
}

function wrapAlignment(content: string, align: string | null): string {
  if (!align) return content
  switch (align) {
    case 'center':
      return `\\begin{center}\n${content}\n\\end{center}`
    case 'right':
      return `\\begin{flushright}\n${content}\n\\end{flushright}`
    default:
      return content
  }
}

function processNode(node: JSONContent): string {
  switch (node.type) {
    case 'heading': {
      const level = node.attrs?.level ?? 1
      const starred = node.attrs?.starred ? '*' : ''
      const text = processInlineContent(node, true)
      const commands = ['\\section', '\\subsection', '\\subsubsection', '\\paragraph']
      const cmd = commands[Math.min(level - 1, commands.length - 1)]
      return `${cmd}${starred}{${text}}`
    }

    case 'paragraph': {
      const text = processInlineContent(node, true)
      if (!text.trim()) return ''
      const align = getAlignment(node)
      return wrapAlignment(text, align)
    }

    case 'bulletList': {
      const env = node.attrs?.environment === 'description' ? 'description' : 'itemize'
      const items = (node.content ?? [])
        .map((item) => {
          const inner = processListItemContent(item.content ?? [])
          return `  \\item ${inner}`
        })
        .join('\n')
      return `\\begin{${env}}\n${items}\n\\end{${env}}`
    }

    case 'orderedList': {
      const items = (node.content ?? [])
        .map((item) => {
          const inner = processListItemContent(item.content ?? [])
          return `  \\item ${inner}`
        })
        .join('\n')
      return `\\begin{enumerate}\n${items}\n\\end{enumerate}`
    }

    case 'blockquote': {
      const env = node.attrs?.environment ?? 'quote'
      const inner = processNodes(node.content ?? [])
      return `\\begin{${env}}\n${inner}\n\\end{${env}}`
    }

    case 'codeBlock': {
      const env = node.attrs?.environment ?? 'verbatim'
      const code = node.content?.map((c) => c.text ?? '').join('') ?? ''
      return `\\begin{${env}}\n${code}\n\\end{${env}}`
    }

    case 'horizontalRule':
      return '\\noindent\\rule{\\textwidth}{0.4pt}'

    case 'image': {
      const src = node.attrs?.src ?? ''
      const alt = node.attrs?.alt ?? ''
      const assetFilename = node.attrs?.assetFilename ?? ''
      const position = node.attrs?.position ?? 'h'
      const options = node.attrs?.options ?? 'width=0.8\\textwidth'
      const isBase64 = src.startsWith('data:')
      const lines = [
        `\\begin{figure}[${position}]`,
        '  \\centering',
      ]
      if (isBase64 && assetFilename) {
        // Asset registered — use the filename (file sent alongside .tex)
        lines.push(`  \\includegraphics[${options}]{${assetFilename}}`)
      } else if (isBase64) {
        lines.push('  % Imagem embutida (base64) — substitua pelo caminho do arquivo')
        lines.push(`  % \\includegraphics[${options}]{imagem.png}`)
      } else {
        lines.push(`  \\includegraphics[${options}]{${src}}`)
      }
      if (alt) {
        lines.push(`  \\caption{${escapeLatex(alt)}}`)
      }
      lines.push('\\end{figure}')
      return lines.join('\n')
    }

    case 'math':
    case 'blockMath': {
      const latex = sanitizeMathUnicode(node.attrs?.latex ?? '')
      // Preserve original environment if it was a named one (eqnarray, displaymath, etc)
      const env = node.attrs?.environment
      if (env) {
        return `\\begin{${env}}\n${latex}\n\\end{${env}}`
      }
      // Preserve $$ vs \[ format
      const format = node.attrs?.format
      if (format === 'dollars') return `$$\n${latex}\n$$`
      return `\\[\n${latex}\n\\]`
    }

    case 'inlineMath': {
      const latex = sanitizeMathUnicode(node.attrs?.latex ?? '')
      return `$${latex}$`
    }

    case 'rawLatex': {
      return node.attrs?.content ?? ''
    }

    case 'latexSpacing': {
      return node.attrs?.command ?? '\\quad'
    }

    case 'mathEnvironment': {
      const latex = sanitizeMathUnicode(node.attrs?.latex ?? '')
      const env = node.attrs?.environment ?? 'equation'
      return `\\begin{${env}}\n${latex}\n\\end{${env}}`
    }

    case 'latexTable': {
      const headers = (node.attrs?.headers ?? []) as string[]
      const rows = (node.attrs?.rows ?? []) as string[][]
      const caption = (node.attrs?.caption ?? '') as string
      const cols = headers.length
      const colSpec = '|' + Array(cols).fill('c').join('|') + '|'
      const hdr = headers.map((h) => escapeLatex(h)).join(' & ')
      const bodyRows = rows
        .map((r) => r.map((c) => escapeLatex(c)).join(' & '))
        .join(' \\\\\n    \\hline\n    ')
      const lines = [
        '\\begin{table}[h]',
        '  \\centering',
        `  \\begin{tabular}{${colSpec}}`,
        '    \\hline',
        `    ${hdr} \\\\`,
        '    \\hline',
        `    ${bodyRows} \\\\`,
        '    \\hline',
        '  \\end{tabular}',
      ]
      if (caption.trim()) {
        lines.push(`  \\caption{${escapeLatex(caption)}}`)
      }
      lines.push('\\end{table}')
      return lines.join('\n')
    }

    case 'tikzFigure': {
      const tikzCode = (node.attrs?.tikzCode ?? '') as string
      return tikzCode
    }

    case 'calloutBlock': {
      const calloutType = (node.attrs?.calloutType ?? 'theorem') as string
      const title = (node.attrs?.title ?? '') as string
      const inner = processNodes(node.content ?? [])
      const titleOpt = title.trim() ? `[${escapeLatex(title)}]` : ''
      return `\\begin{${calloutType}}${titleOpt}\n${inner}\n\\end{${calloutType}}`
    }

    default:
      if (node.content) {
        return processNodes(node.content)
      }
      return ''
  }
}

function processNodes(nodes: JSONContent[]): string {
  return nodes.map(processNode).filter(Boolean).join('\n\n')
}

/** Process list item content — join with \n (not \n\n) to avoid breaking list structure */
function processListItemContent(nodes: JSONContent[]): string {
  return nodes.map(processNode).filter(Boolean).join('\n')
}

/**
 * Common LaTeX shorthand commands that aren't defined by default.
 * Maps command name (without backslash) → its \newcommand definition.
 * These are auto-injected into the preamble when detected in the document body.
 */
const SHORTHAND_COMMANDS: Record<string, string> = {
  // Number sets
  'N': '\\newcommand{\\N}{\\mathbb{N}}',
  'Z': '\\newcommand{\\Z}{\\mathbb{Z}}',
  'Q': '\\newcommand{\\Q}{\\mathbb{Q}}',
  'R': '\\newcommand{\\R}{\\mathbb{R}}',
  'C': '\\newcommand{\\C}{\\mathbb{C}}',
  'F': '\\newcommand{\\F}{\\mathbb{F}}',
  'K': '\\newcommand{\\K}{\\mathbb{K}}',
  'P': '\\newcommand{\\P}{\\mathbb{P}}',
  // Common operators
  'abs': '\\newcommand{\\abs}[1]{\\left|#1\\right|}',
  'norm': '\\newcommand{\\norm}[1]{\\left\\|#1\\right\\|}',
  'ceil': '\\newcommand{\\ceil}[1]{\\left\\lceil#1\\right\\rceil}',
  'floor': '\\newcommand{\\floor}[1]{\\left\\lfloor#1\\right\\rfloor}',
  'inner': '\\newcommand{\\inner}[2]{\\left\\langle#1,#2\\right\\rangle}',
  // Differential/calculus
  'dd': '\\newcommand{\\dd}{\\,\\mathrm{d}}',
  'dv': '\\newcommand{\\dv}[2]{\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}}',
  'pdv': '\\newcommand{\\pdv}[2]{\\frac{\\partial#1}{\\partial#2}}',
  // Set theory
  'powerset': '\\newcommand{\\powerset}{\\mathcal{P}}',
  // Linear algebra
  'tr': '\\newcommand{\\tr}{\\operatorname{tr}}',
  'rank': '\\newcommand{\\rank}{\\operatorname{rank}}',
  'diag': '\\newcommand{\\diag}{\\operatorname{diag}}',
  'sgn': '\\newcommand{\\sgn}{\\operatorname{sgn}}',
  'id': '\\newcommand{\\id}{\\operatorname{id}}',
  'im': '\\newcommand{\\im}{\\operatorname{im}}',
}

/**
 * Scan LaTeX source for shorthand commands (e.g. \N, \R) and return
 * the \newcommand definitions needed. Skips commands already defined
 * in the custom preamble.
 */
function collectShorthandDefs(body: string, customPreamble: string): string[] {
  const defs: string[] = []
  for (const [cmd, def] of Object.entries(SHORTHAND_COMMANDS)) {
    // Match \cmd when followed by a non-letter (word boundary in LaTeX)
    const regex = new RegExp(`\\\\${cmd}(?![a-zA-Z])`)
    if (regex.test(body) && !customPreamble.includes(`\\newcommand{\\${cmd}}`)) {
      defs.push(def)
    }
  }
  return defs
}

const CALLOUT_THEOREM_DEFS: Record<string, string> = {
  theorem: '\\newtheorem{theorem}{Teorema}',
  definition: '\\newtheorem{definition}{Definição}',
  lemma: '\\newtheorem{lemma}{Lema}',
  corollary: '\\newtheorem{corollary}{Corolário}',
  remark: '\\newtheorem{remark}{Observação}',
  example: '\\newtheorem{example}{Exemplo}',
  exercise: '\\newtheorem{exercise}{Exercício}',
  proposition: '\\newtheorem{proposition}{Proposição}',
  conjecture: '\\newtheorem{conjecture}{Conjectura}',
  note: '\\newtheorem{note}{Nota}',
}

function collectCalloutTypes(nodes: JSONContent[]): Set<string> {
  const types = new Set<string>()
  for (const node of nodes) {
    if (node.type === 'calloutBlock') {
      types.add((node.attrs?.calloutType ?? 'theorem') as string)
    }
    if (node.content) {
      for (const t of collectCalloutTypes(node.content)) {
        types.add(t)
      }
    }
  }
  return types
}

function hasTikzFigure(nodes: JSONContent[]): boolean {
  for (const node of nodes) {
    if (node.type === 'tikzFigure') return true
    if (node.type === 'rawLatex' && typeof node.attrs?.content === 'string' && node.attrs.content.includes('\\begin{tikzpicture}')) return true
    if (node.content && hasTikzFigure(node.content)) return true
  }
  return false
}

export function generateLatex(doc: JSONContent, customPreamble?: string): string {
  const body = processNodes(doc.content ?? [])

  const extraBlock = customPreamble?.trim() ? `\n${customPreamble.trim()}\n` : ''

  // Auto-detect callout types and generate \newtheorem definitions
  const calloutTypes = collectCalloutTypes(doc.content ?? [])
  let theoremDefs = ''
  if (calloutTypes.size > 0) {
    const needsAmsthm = !extraBlock.includes('amsthm')
    const defs: string[] = []
    if (needsAmsthm) defs.push('\\usepackage{amsthm}')
    // proof is built-in with amsthm, no \newtheorem needed
    for (const t of calloutTypes) {
      if (t === 'proof') {
        if (!extraBlock.includes('\\qedsymbol')) {
          defs.push('\\renewcommand{\\qedsymbol}{$\\blacksquare$}')
        }
        continue
      }
      // Only add if not already defined in custom preamble
      if (!extraBlock.includes(`\\newtheorem{${t}}`)) {
        const def = CALLOUT_THEOREM_DEFS[t]
        if (def) defs.push(def)
      }
    }
    if (defs.length > 0) theoremDefs = '\n' + defs.join('\n') + '\n'
  }

  // Auto-detect TikZ figures and add required packages
  const needsTikz = hasTikzFigure(doc.content ?? []) || body.includes('\\begin{tikzpicture}')
  let tikzDefs = ''
  if (needsTikz && !extraBlock.includes('\\usepackage{tikz}')) {
    const defs: string[] = ['\\usepackage{tikz}']
    if (!extraBlock.includes('shapes.geometric')) {
      defs.push('\\usetikzlibrary{shapes.geometric}')
    }
    if (body.includes('drop shadow') && !extraBlock.includes('shadows')) {
      defs.push('\\usetikzlibrary{shadows}')
    }
    tikzDefs = '\n' + defs.join('\n') + '\n'
  }

  // Auto-detect shorthand commands (\N, \R, etc.) and generate definitions
  const shorthandDefs = collectShorthandDefs(body, extraBlock)
  const shorthandBlock = shorthandDefs.length > 0
    ? '\n' + shorthandDefs.join('\n') + '\n'
    : ''

  const preamble = `\\documentclass[12pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazilian]{babel}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{xspace}
\\geometry{margin=2.5cm}
${extraBlock}${tikzDefs}${theoremDefs}${shorthandBlock}
\\begin{document}

${body}

\\end{document}`

  return preamble
}
