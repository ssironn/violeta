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
        return `$${sanitizeMathUnicode(child.attrs?.latex ?? '')}$`
      }
      if (child.type === 'latexSpacing') {
        return child.attrs?.command ?? '\\quad'
      }
      if (child.type === 'hardBreak') {
        return ' \\\\\n'
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
      const text = processInlineContent(node, true)
      const commands = ['\\section', '\\subsection', '\\subsubsection', '\\paragraph']
      const cmd = commands[Math.min(level - 1, commands.length - 1)]
      return `${cmd}{${text}}`
    }

    case 'paragraph': {
      const text = processInlineContent(node, true)
      if (!text.trim()) return ''
      const align = getAlignment(node)
      return wrapAlignment(text, align)
    }

    case 'bulletList': {
      const items = (node.content ?? [])
        .map((item) => {
          const inner = processNodes(item.content ?? [])
          return `  \\item ${inner}`
        })
        .join('\n')
      return `\\begin{itemize}\n${items}\n\\end{itemize}`
    }

    case 'orderedList': {
      const items = (node.content ?? [])
        .map((item) => {
          const inner = processNodes(item.content ?? [])
          return `  \\item ${inner}`
        })
        .join('\n')
      return `\\begin{enumerate}\n${items}\n\\end{enumerate}`
    }

    case 'blockquote': {
      const inner = processNodes(node.content ?? [])
      return `\\begin{quote}\n${inner}\n\\end{quote}`
    }

    case 'codeBlock': {
      const code = node.content?.map((c) => c.text ?? '').join('') ?? ''
      return `\\begin{verbatim}\n${code}\n\\end{verbatim}`
    }

    case 'horizontalRule':
      return '\\noindent\\rule{\\textwidth}{0.4pt}'

    case 'image': {
      const src = node.attrs?.src ?? ''
      const alt = node.attrs?.alt ?? ''
      const isBase64 = src.startsWith('data:')
      const lines = [
        '\\begin{figure}[h]',
        '  \\centering',
      ]
      if (isBase64) {
        lines.push('  % Imagem embutida (base64) — substitua pelo caminho do arquivo')
        lines.push('  % \\includegraphics[width=0.8\\textwidth]{imagem.png}')
      } else {
        lines.push(`  \\includegraphics[width=0.8\\textwidth]{${src}}`)
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
      if (t === 'proof') continue
      // Only add if not already defined in custom preamble
      if (!extraBlock.includes(`\\newtheorem{${t}}`)) {
        const def = CALLOUT_THEOREM_DEFS[t]
        if (def) defs.push(def)
      }
    }
    if (defs.length > 0) theoremDefs = '\n' + defs.join('\n') + '\n'
  }

  const preamble = `\\documentclass[12pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazilian]{babel}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
${extraBlock}${theoremDefs}
\\begin{document}

${body}

\\end{document}`

  return preamble
}
