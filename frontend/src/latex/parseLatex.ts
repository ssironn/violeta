import type { JSONContent } from '@tiptap/core'
import { parsePgfplotsCode } from '../pgfplots/pgfplotsParser'

// ─── Helpers ──────────────────────────────────────────────────────

function findClosingBrace(s: string, start: number): number {
  let depth = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{' && (i === 0 || s[i - 1] !== '\\')) depth++
    if (s[i] === '}' && (i === 0 || s[i - 1] !== '\\')) depth--
    if (depth === 0) return i
  }
  return s.length
}

function extractBraceGroup(s: string, pos: number): { content: string; end: number } {
  const open = s.indexOf('{', pos)
  if (open === -1) return { content: '', end: pos }
  const close = findClosingBrace(s, open)
  return { content: s.slice(open + 1, close), end: close + 1 }
}

function unescapeLatex(text: string): string {
  return text
    .replace(/\\textbackslash\{\}/g, '\\')
    .replace(/\\textasciitilde\{\}/g, '~')
    .replace(/\\textasciicircum\{\}/g, '^')
    .replace(/\\([#$%&_{}])/g, '$1')
}

/** Normalize line endings and strip comments */
function normalize(latex: string): string {
  return latex
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => {
      const idx = line.search(/(?<!\\)%/)
      return idx !== -1 ? line.slice(0, idx) : line
    })
    .join('\n')
}

// ─── Commands to preserve as rawLatex inline (not editable but round-trip safe) ───

const PRESERVE_COMMANDS = new Set([
  'label', 'ref', 'pageref', 'cite', 'eqref', 'autoref', 'nameref',
  'vspace', 'hspace',
  'phantom', 'hphantom', 'vphantom',
  'footnote', 'footnotemark', 'footnotetext',
  'bibliographystyle', 'bibliography',
])

// ─── Commands to skip (truly no-op in visual editor) ───

const SKIP_COMMANDS = new Set([
  'maketitle', 'tableofcontents',
  'centering', 'raggedleft', 'raggedright',
  'indent', 'noindent',
  'pagestyle', 'thispagestyle',
  'setlength', 'addtolength',
  'setcounter', 'addtocounter',
  'newline', 'linebreak', 'pagebreak',
])

// ─── Standalone spacing commands → rawLatex block (no args, just the command) ───

const STANDALONE_SPACING_COMMANDS = new Set([
  'vfill', 'hfill', 'smallskip', 'medskip', 'bigskip',
  'newpage', 'clearpage',
])

// Commands that just change font style — pass through inner content
const FONT_COMMANDS = new Set([
  'large', 'Large', 'LARGE', 'huge', 'Huge',
  'small', 'footnotesize', 'scriptsize', 'tiny', 'normalsize',
  'sc', 'sf', 'rm', 'tt', 'sl',
  'textrm', 'textsf', 'textsl', 'textnormal',
  'mbox', 'text', 'mathrm',
])

// ─── Accent handling ──────────────────────────────────────────────

const ACCENT_MAP: Record<string, Record<string, string>> = {
  "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' },
  '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
  '~': { a: 'ã', o: 'õ', n: 'ñ', A: 'Ã', O: 'Õ', N: 'Ñ' },
  '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
  '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' },
}

/** Try to resolve an accent command like \'{e} or \'e or \~{a} or \~a */
function resolveAccent(text: string, i: number): { char: string; end: number } | null {
  // text[i] = '\\', text[i+1] is the accent character
  const accent = text[i + 1]
  if (!(accent in ACCENT_MAP)) {
    // Special: \c{c} → ç
    if (accent === 'c') {
      const after = i + 2
      if (text[after] === '{') {
        const group = extractBraceGroup(text, after)
        const letter = group.content.trim()
        if (letter === 'c') return { char: 'ç', end: group.end }
        if (letter === 'C') return { char: 'Ç', end: group.end }
        return { char: letter, end: group.end }
      }
      if (text[after] === ' ' && /[a-zA-Z]/.test(text[after + 1] ?? '')) {
        const letter = text[after + 1]
        if (letter === 'c') return { char: 'ç', end: after + 2 }
        if (letter === 'C') return { char: 'Ç', end: after + 2 }
      }
    }
    return null
  }

  const map = ACCENT_MAP[accent]
  const after = i + 2

  // \'{e} or \~{a} form
  if (text[after] === '{') {
    const group = extractBraceGroup(text, after)
    const letter = group.content.trim()
    const resolved = map[letter]
    return { char: resolved ?? letter, end: group.end }
  }

  // \'e or \~a form (accent + single letter)
  const letter = text[after]
  if (letter && /[a-zA-Z]/.test(letter)) {
    const resolved = map[letter]
    return { char: resolved ?? letter, end: after + 1 }
  }

  return null
}

// ─── Inline Parsing ──────────────────────────────────────────────

const INLINE_MARK_COMMANDS: Record<string, string> = {
  textbf: 'bold',
  textit: 'italic',
  underline: 'underline',
  texttt: 'code',
  emph: 'italic',
  bf: 'bold',
  it: 'italic',
}

function addMarkToNodes(nodes: JSONContent[], mark: { type: string; attrs?: Record<string, any> }): JSONContent[] {
  return nodes.map((node) => {
    if (node.type === 'text') {
      return { ...node, marks: [...(node.marks ?? []), mark] }
    }
    return node
  })
}

function parseInline(text: string): JSONContent[] {
  const nodes: JSONContent[] = []
  let i = 0

  while (i < text.length) {
    if (i === 0 && !text.trim()) break

    // Check for \\ (hard break), optionally followed by [<spacing>]
    if (text[i] === '\\' && text[i + 1] === '\\') {
      i += 2
      // Consume optional spacing argument \\[0.3cm], \\[1ex], etc.
      const spacingMatch = text.slice(i).match(/^\[([^\]]*)\]/)
      const attrs: Record<string, any> = {}
      if (spacingMatch) {
        attrs.spacing = spacingMatch[1]
        i += spacingMatch[0].length
      }
      nodes.push({ type: 'hardBreak', ...(Object.keys(attrs).length > 0 ? { attrs } : {}) })
      if (i < text.length && text[i] === '\n') i++
      continue
    }

    // Check for escaped special characters: \$, \#, \%, \&, \_, \{, \}
    if (text[i] === '\\' && i + 1 < text.length && '#$%&_{}'.includes(text[i + 1])) {
      nodes.push({ type: 'text', text: text[i + 1] })
      i += 2
      continue
    }

    // Check for inline math $...$
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1)
      if (end !== -1) {
        const latex = text.slice(i + 1, end)
        nodes.push({ type: 'inlineMath', attrs: { latex } })
        i = end + 1
        continue
      }
    }

    // Check for LaTeX commands
    if (text[i] === '\\' && i + 1 < text.length) {
      // Try accent commands first (\'e, \~a, \^o, \`a, \"u, \c c)
      if ("'`~^\"c".includes(text[i + 1])) {
        const accent = resolveAccent(text, i)
        if (accent) {
          nodes.push({ type: 'text', text: accent.char })
          i = accent.end
          continue
        }
      }

      if (/[a-zA-Z]/.test(text[i + 1])) {
        const cmdMatch = text.slice(i).match(/^\\([a-zA-Z]+)/)
        if (cmdMatch) {
          const cmd = cmdMatch[1]
          const afterCmd = i + cmdMatch[0].length

          // Inline mark commands
          if (cmd in INLINE_MARK_COMMANDS) {
            if (text[afterCmd] === '{') {
              const group = extractBraceGroup(text, afterCmd)
              const inner = parseInline(group.content)
              const marked = addMarkToNodes(inner, { type: INLINE_MARK_COMMANDS[cmd] })
              nodes.push(...marked)
              i = group.end
            } else {
              // Standalone \bf, \it — apply mark to rest of current scope
              const rest = text.slice(afterCmd)
              const inner = parseInline(rest)
              const marked = addMarkToNodes(inner, { type: INLINE_MARK_COMMANDS[cmd] })
              nodes.push(...marked)
              i = text.length
            }
            continue
          }

          // \href{url}{text}
          if (cmd === 'href') {
            const urlGroup = extractBraceGroup(text, afterCmd)
            const textGroup = extractBraceGroup(text, urlGroup.end)
            const inner = parseInline(textGroup.content)
            const marked = addMarkToNodes(inner, { type: 'link', attrs: { href: urlGroup.content } })
            nodes.push(...marked)
            i = textGroup.end
            continue
          }

          // Preserve commands → rawLatex inline (round-trip safe)
          if (PRESERVE_COMMANDS.has(cmd)) {
            let end = afterCmd
            // Capture optional [] and {} args as part of the raw command
            while (end < text.length && (text[end] === '[' || text[end] === '{' || text[end] === ' ')) {
              if (text[end] === ' ') { end++; continue }
              if (text[end] === '[') {
                const close = text.indexOf(']', end)
                end = close !== -1 ? close + 1 : end + 1
              } else if (text[end] === '{') {
                const group = extractBraceGroup(text, end)
                end = group.end
              }
            }
            const rawContent = text.slice(i, end)
            nodes.push({ type: 'rawLatex', attrs: { content: rawContent, inline: true } })
            i = end
            continue
          }

          // Skip commands (truly no-op in visual editor)
          if (SKIP_COMMANDS.has(cmd)) {
            i = afterCmd
            // Consume optional [] and {} args
            while (i < text.length && (text[i] === '[' || text[i] === '{' || text[i] === ' ')) {
              if (text[i] === ' ') { i++; continue }
              if (text[i] === '[') {
                const close = text.indexOf(']', i)
                i = close !== -1 ? close + 1 : i + 1
              } else if (text[i] === '{') {
                const group = extractBraceGroup(text, i)
                i = group.end
              }
            }
            continue
          }

          // Font/pass-through commands — extract inner content
          if (FONT_COMMANDS.has(cmd)) {
            if (text[afterCmd] === '{') {
              const group = extractBraceGroup(text, afterCmd)
              const inner = parseInline(group.content)
              nodes.push(...inner)
              i = group.end
            } else {
              // Standalone font command — pass through rest of current scope
              const rest = text.slice(afterCmd)
              const inner = parseInline(rest)
              nodes.push(...inner)
              i = text.length
            }
            continue
          }

          // Unknown command with [] and/or {} args — preserve as rawLatex inline
          // Consume all consecutive [...] and {...} argument groups
          if (text[afterCmd] === '{' || text[afterCmd] === '[') {
            let end = afterCmd
            while (end < text.length && (text[end] === '[' || text[end] === '{')) {
              if (text[end] === '[') {
                const closeBracket = text.indexOf(']', end)
                if (closeBracket === -1) break
                end = closeBracket + 1
              } else if (text[end] === '{') {
                const group = extractBraceGroup(text, end)
                end = group.end
              }
            }
            const rawContent = text.slice(i, end)
            nodes.push({ type: 'rawLatex', attrs: { content: rawContent, inline: true } })
            i = end
            continue
          }

          // Standalone command — skip
          i = afterCmd
          continue
        }
      }
    }

    // Bare brace groups {text} — parse inner content
    if (text[i] === '{') {
      const group = extractBraceGroup(text, i)
      const inner = parseInline(group.content)
      nodes.push(...inner)
      i = group.end
      continue
    }

    // Plain text — accumulate until next special character
    let end = i + 1
    while (end < text.length) {
      if (text[end] === '$' || text[end] === '{') break
      if (text[end] === '\\' && end + 1 < text.length) {
        if (text[end + 1] === '\\') break
        if (/[a-zA-Z'`~^"c]/.test(text[end + 1])) break
        // Break on escaped special characters (\$, \#, etc.)
        if ('#$%&_{}'.includes(text[end + 1])) break
      }
      end++
    }

    const raw = text.slice(i, end)
    const unescaped = unescapeLatex(raw)
    if (unescaped.trim() || unescaped.includes(' ')) {
      nodes.push({ type: 'text', text: unescaped })
    }
    i = end
  }

  return mergeTextNodes(nodes)
}

/** Merge adjacent text nodes with identical marks into single nodes */
function mergeTextNodes(nodes: JSONContent[]): JSONContent[] {
  if (nodes.length <= 1) return nodes

  const result: JSONContent[] = []

  for (const node of nodes) {
    if (node.type !== 'text' || result.length === 0) {
      result.push(node)
      continue
    }
    const prev = result[result.length - 1]
    if (prev.type === 'text' && marksEqual(prev.marks, node.marks)) {
      prev.text = (prev.text ?? '') + (node.text ?? '')
    } else {
      result.push(node)
    }
  }

  return result
}

function marksEqual(a?: JSONContent['marks'], b?: JSONContent['marks']): boolean {
  const ma = a ?? []
  const mb = b ?? []
  if (ma.length !== mb.length) return false
  return ma.every((m, i) => {
    const n = mb[i]
    return m.type === n.type && JSON.stringify(m.attrs ?? {}) === JSON.stringify(n.attrs ?? {})
  })
}

// ─── Block Parsing ───────────────────────────────────────────────

function findEnvironmentEnd(body: string, envName: string, startAfterBegin: number): number {
  const endTag = `\\end{${envName}}`
  const beginTag = `\\begin{${envName}}`
  let depth = 1
  let pos = startAfterBegin

  while (pos < body.length && depth > 0) {
    const nextEnd = body.indexOf(endTag, pos)
    const nextBegin = body.indexOf(beginTag, pos)

    if (nextEnd === -1) return body.length

    if (nextBegin !== -1 && nextBegin < nextEnd) {
      depth++
      pos = nextBegin + beginTag.length
    } else {
      depth--
      if (depth === 0) return nextEnd
      pos = nextEnd + endTag.length
    }
  }
  return body.length
}

function parseListItems(inner: string): JSONContent[] {
  const items: JSONContent[] = []

  // Split on \item only at depth 0 (not inside nested environments)
  const itemTexts: string[] = []
  let depth = 0
  let current = ''
  let pos = 0

  while (pos < inner.length) {
    if (inner.startsWith('\\begin{', pos)) {
      const closeBrace = inner.indexOf('}', pos + 7)
      if (closeBrace !== -1) {
        current += inner.slice(pos, closeBrace + 1)
        depth++
        pos = closeBrace + 1
        continue
      }
    }
    if (inner.startsWith('\\end{', pos)) {
      const closeBrace = inner.indexOf('}', pos + 5)
      if (closeBrace !== -1) {
        current += inner.slice(pos, closeBrace + 1)
        depth--
        pos = closeBrace + 1
        continue
      }
    }
    if (depth === 0 && inner.startsWith('\\item', pos)) {
      const afterItem = pos + 5
      if (afterItem >= inner.length || !/[a-zA-Z]/.test(inner[afterItem])) {
        if (current.trim() || itemTexts.length > 0) {
          itemTexts.push(current)
        }
        current = ''
        pos = afterItem
        while (pos < inner.length && /\s/.test(inner[pos])) pos++
        continue
      }
    }
    current += inner[pos]
    pos++
  }
  if (current.trim()) {
    itemTexts.push(current)
  }

  for (const part of itemTexts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // If the item contains any \begin{...} environment, parse as blocks
    // (handles nested lists, equation*, align*, etc.)
    if (/\\begin\{/.test(trimmed)) {
      const blocks = flatParseBlocks(trimmed)
      if (blocks.length > 0) {
        items.push({ type: 'listItem', content: blocks })
      }
    } else {
      const inlineContent = parseInline(trimmed)
      if (inlineContent.length > 0) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: inlineContent }],
        })
      }
    }
  }

  return items
}

/** Named math environments → mathEnvironment node (preserves environment name) */
const NAMED_MATH_ENVIRONMENTS = new Set([
  'equation', 'equation*', 'align', 'align*',
  'gather', 'gather*', 'multline', 'multline*',
  'cases',
])

/** Math environments that map to plain blockMath (unnamed display math) */
const PLAIN_MATH_ENVIRONMENTS = new Set([
  'eqnarray', 'eqnarray*', 'displaymath',
  'math', 'array',
])

/** Known block-level environments */
const LIST_ENVIRONMENTS = new Set(['itemize', 'enumerate', 'description'])
const QUOTE_ENVIRONMENTS = new Set(['quote', 'quotation', 'abstract'])
const CODE_ENVIRONMENTS = new Set(['verbatim', 'lstlisting', 'minted'])
const ALIGN_ENVIRONMENTS = new Set(['center', 'flushleft', 'flushright'])

/** Theorem-like environments → calloutBlock node (builtins) */
const CALLOUT_ENVIRONMENTS = new Set([
  'theorem', 'definition', 'lemma', 'proof',
  'corollary', 'remark', 'example', 'exercise',
  'proposition', 'conjecture', 'note',
  'ques', 'questao',
])

// ─── Dynamic Theorem Definitions ─────────────────────────────────

export interface TheoremDef {
  envName: string
  label: string
  style?: string          // "plain" | "definition" | "remark" | ...
  sharedCounter?: string  // \newtheorem{cor}[theorem]{...}
  numberWithin?: string   // \newtheorem{theorem}{...}[section]
}

/**
 * Parse `\theoremstyle{...}` and `\newtheorem{...}{...}` declarations from a preamble string.
 * Returns structured TheoremDef[] for all user-defined theorem environments.
 */
export function parseTheoremDefs(preamble: string): TheoremDef[] {
  const defs: TheoremDef[] = []
  let currentStyle: string | undefined

  const lines = preamble.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Track \theoremstyle{X}
    const styleMatch = line.match(/\\theoremstyle\{([^}]+)\}/)
    if (styleMatch) {
      currentStyle = styleMatch[1]
      // A theoremstyle line may also contain a \newtheorem on the same line,
      // so don't `continue` here — fall through to the newtheorem check.
    }

    // Match \newtheorem{name}[shared]{Label}[within]
    // or    \newtheorem{name}{Label}[within]
    const ntMatch = line.match(
      /\\newtheorem\{([^}]+)\}(?:\[([^\]]+)\])?\{([^}]+)\}(?:\[([^\]]+)\])?/
    )
    if (ntMatch) {
      const envName = ntMatch[1]
      const sharedCounter = ntMatch[2] || undefined
      const label = ntMatch[3]
      const numberWithin = ntMatch[4] || undefined

      // Skip environments that are already builtin
      if (!CALLOUT_ENVIRONMENTS.has(envName)) {
        defs.push({
          envName,
          label,
          style: currentStyle,
          sharedCounter,
          numberWithin,
        })
      }
    }
  }

  return defs
}

/** Runtime-mutable set: builtins + dynamic \newtheorem names from current parse */
let dynamicCalloutEnvs: Set<string> = CALLOUT_ENVIRONMENTS

// ─── Table Parsing ──────────────────────────────────────────────

function parseTabular(inner: string, _beginTag: string): JSONContent[] {
  // Split rows by \\ and parse cells by &
  const rowStrs = inner.split(/\\\\/).map((r) => r.trim()).filter(Boolean)
  const allRows: string[][] = []

  for (const rowStr of rowStrs) {
    // Skip \hline, \cline, \toprule, \midrule, \bottomrule
    const cleaned = rowStr.replace(/\\(hline|cline\{[^}]*\}|toprule|midrule|bottomrule)\s*/g, '').trim()
    if (!cleaned) continue
    // Unescape LaTeX special chars so cells don't accumulate escaping on round-trips
    const cells = cleaned.split('&').map((c) => unescapeLatex(c.trim()))
    allRows.push(cells)
  }

  if (allRows.length === 0) {
    return [{ type: 'latexTable', attrs: { headers: ['', '', ''], rows: [['', '', '']], caption: '' } }]
  }

  // First row is headers, rest are body
  const headers = allRows[0]
  const rows = allRows.length > 1 ? allRows.slice(1) : [headers.map(() => '')]

  // Normalize column count
  const cols = Math.max(headers.length, ...rows.map((r) => r.length))
  while (headers.length < cols) headers.push('')
  for (const row of rows) {
    while (row.length < cols) row.push('')
  }

  return [{ type: 'latexTable', attrs: { headers, rows, caption: '' } }]
}

function parseTableEnv(inner: string): JSONContent[] {
  // Extract caption (using brace-aware extraction for nested braces)
  let caption = ''
  const captionIdx = inner.indexOf('\\caption{')
  if (captionIdx !== -1) {
    const group = extractBraceGroup(inner, captionIdx + '\\caption'.length)
    caption = unescapeLatex(group.content)
  }

  // Extract tabular content
  const tabularMatch = inner.match(/\\begin\{tabular\}(?:\{[^}]*\})?([\s\S]*?)\\end\{tabular\}/)
  if (tabularMatch) {
    const result = parseTabular(tabularMatch[1], '')
    if (result.length > 0 && result[0].attrs) {
      result[0].attrs.caption = caption
    }
    return result
  }

  // No tabular found — return empty table
  return [{ type: 'latexTable', attrs: { headers: ['', '', ''], rows: [['', '', '']], caption } }]
}

function parseBlock(block: string): JSONContent[] {
  const trimmed = block.trim()
  if (!trimmed) return []

  // Heading commands
  const headingMatch = trimmed.match(/^\\(section|subsection|subsubsection|paragraph)(\*?)\{/)
  if (headingMatch) {
    const cmd = headingMatch[1]
    const starred = headingMatch[2] === '*'
    const levels: Record<string, number> = { section: 1, subsection: 2, subsubsection: 3, paragraph: 4 }
    const level = levels[cmd] ?? 1
    const group = extractBraceGroup(trimmed, headingMatch[0].length - 1)
    const content = parseInline(group.content)
    return content.length > 0 ? [{ type: 'heading', attrs: { level, starred }, content }] : []
  }

  // Horizontal rule
  if (trimmed.startsWith('\\noindent\\rule') || trimmed === '\\hrule') {
    return [{ type: 'horizontalRule' }]
  }

  // Display math $$...$$
  const displayMathMatch = trimmed.match(/^\$\$([\s\S]*?)\$\$$/)
  if (displayMathMatch) {
    return [{ type: 'blockMath', attrs: { latex: displayMathMatch[1].trim(), format: 'dollars' } }]
  }

  // Block math \[...\]
  const blockMathMatch = trimmed.match(/^\\\[([\s\S]*?)\\\]$/)
  if (blockMathMatch) {
    return [{ type: 'blockMath', attrs: { latex: blockMathMatch[1].trim(), format: 'brackets' } }]
  }

  // Standalone spacing commands → preserve as rawLatex block
  const spacingMatch = trimmed.match(/^\\(vspace|hspace|vfill|hfill|smallskip|medskip|bigskip|newpage|clearpage)\b/)
  if (spacingMatch) {
    if (STANDALONE_SPACING_COMMANDS.has(spacingMatch[1])) {
      return [{ type: 'rawLatex', attrs: { content: trimmed } }]
    }
    // vspace/hspace with args — also preserve
    return [{ type: 'rawLatex', attrs: { content: trimmed } }]
  }

  // Environments
  const envMatch = trimmed.match(/^\\begin\{([^}]+)\}/)
  if (envMatch) {
    const envName = envMatch[1]
    const beginTag = `\\begin{${envName}}`
    const afterBegin = trimmed.indexOf(beginTag) + beginTag.length
    const endPos = findEnvironmentEnd(trimmed, envName, afterBegin)
    const inner = trimmed.slice(afterBegin, endPos).trim()

    // Named math environments → mathEnvironment
    if (NAMED_MATH_ENVIRONMENTS.has(envName)) {
      return [{ type: 'mathEnvironment', attrs: { environment: envName, latex: inner } }]
    }

    // Plain math environments → blockMath (preserve environment name)
    if (PLAIN_MATH_ENVIRONMENTS.has(envName)) {
      return [{ type: 'blockMath', attrs: { latex: inner, environment: envName } }]
    }

    // TikZ figures → tikzFigure or pgfplotBlock node
    if (envName === 'tikzpicture') {
      const endTag = `\\end{tikzpicture}`
      const fullEnv = `\\begin{tikzpicture}\n${inner}\n${endTag}`
      // Detect pgfplots: if inner contains \begin{axis}, treat as pgfplotBlock
      if (inner.includes('\\begin{axis}')) {
        const plotConfig = parsePgfplotsCode(fullEnv)
        return [{ type: 'pgfplotBlock', attrs: { pgfCode: fullEnv, plotConfig } }]
      }
      return [{ type: 'tikzFigure', attrs: { tikzCode: fullEnv, shapes: [] } }]
    }

    // List environments — preserve environment name
    if (LIST_ENVIRONMENTS.has(envName)) {
      const items = parseListItems(inner)
      if (items.length === 0) return []
      const listType = envName === 'enumerate' ? 'orderedList' : 'bulletList'
      const attrs: Record<string, any> = {}
      if (envName === 'description') attrs.environment = 'description'
      return [{ type: listType, ...(Object.keys(attrs).length > 0 ? { attrs } : {}), content: items }]
    }

    // Quote environments — preserve environment name
    if (QUOTE_ENVIRONMENTS.has(envName)) {
      const innerBlocks = flatParseBlocks(inner)
      return [{ type: 'blockquote', attrs: { environment: envName }, content: innerBlocks.length > 0 ? innerBlocks : [{ type: 'paragraph' }] }]
    }

    // Code environments — preserve environment name
    if (CODE_ENVIRONMENTS.has(envName)) {
      return [{ type: 'codeBlock', attrs: { environment: envName }, content: [{ type: 'text', text: inner }] }]
    }

    // Alignment environments — parse as blocks and propagate alignment attribute
    if (ALIGN_ENVIRONMENTS.has(envName)) {
      const align = envName === 'flushright' ? 'right' : envName === 'center' ? 'center' : undefined
      const blocks = flatParseBlocks(inner)
      if (blocks.length === 0) return []
      if (align) {
        for (const block of blocks) {
          if (!block.attrs) block.attrs = {}
          block.attrs.textAlign = align
        }
      }
      return blocks
    }

    // Figure — may contain an image, tikzpicture, or pgfplot
    if (envName === 'figure' || envName === 'figure*') {
      // Helper: extract caption using brace-aware parsing
      function extractCaptionFromInner(text: string): string {
        const idx = text.indexOf('\\caption{')
        if (idx === -1) return ''
        const group = extractBraceGroup(text, idx + '\\caption'.length)
        return unescapeLatex(group.content)
      }

      // Helper: strip caption command (brace-aware) from text
      function stripCaption(text: string): string {
        const idx = text.indexOf('\\caption{')
        if (idx === -1) return text
        const group = extractBraceGroup(text, idx + '\\caption'.length)
        return text.slice(0, idx) + text.slice(group.end)
      }

      // Check if figure wraps a tikzpicture (with or without pgfplots axis)
      if (inner.includes('\\begin{tikzpicture}')) {
        // Strip figure-level commands, keep only the tikzpicture environment
        const cleaned = stripCaption(inner)
          .replace(/^\s*\[[^\]]*\]/, '')   // strip position parameter [h], [ht!], etc.
          .replace(/\\centering\b/g, '')
          .replace(/\\label\{[^}]*\}/g, '')
          .trim()
        const results: JSONContent[] = flatParseBlocks(cleaned)
        // Add caption as a styled paragraph if present
        const captionText = extractCaptionFromInner(inner)
        if (captionText) {
          results.push({
            type: 'paragraph',
            attrs: { textAlign: 'center' },
            content: [{ type: 'text', marks: [{ type: 'italic' }], text: captionText }],
          })
        }
        return results
      }

      let src = ''
      let alt = ''
      let imgOptions = 'width=0.8\\textwidth'
      // Extract position from \begin{figure}[pos]
      const posMatch = trimmed.match(/^\\begin\{figure\*?\}\s*\[([^\]]*)\]/)
      const position = posMatch ? posMatch[1] : 'h'
      const imgMatch = inner.match(/\\includegraphics(?:\[([^\]]*)\])?\{([^}]*)\}/)
      if (imgMatch) {
        if (imgMatch[1]) imgOptions = imgMatch[1]
        src = imgMatch[2]
      }
      alt = extractCaptionFromInner(inner)
      // Detect alignment command
      let alignment = 'center'
      if (/\\raggedright\b/.test(inner)) alignment = 'left'
      else if (/\\raggedleft\b/.test(inner)) alignment = 'right'
      return [{ type: 'image', attrs: { src, alt, position, options: imgOptions, alignment } }]
    }

    // Table environment
    if (envName === 'table') {
      return parseTableEnv(inner)
    }

    // Bare tabular (without table wrapper)
    if (envName === 'tabular') {
      return parseTabular(inner, envMatch[0])
    }

    // Callout / theorem-like environments → calloutBlock
    if (dynamicCalloutEnvs.has(envName)) {
      // Extract optional title: \begin{theorem}[Title] or strip \label{}
      let title = ''
      let cleanInner = inner
      const titleMatch = cleanInner.match(/^\s*\[([^\]]*)\]/)
      if (titleMatch) {
        title = titleMatch[1]
        cleanInner = cleanInner.slice(titleMatch[0].length)
      }
      // \label is now preserved by parseInline as rawLatex inline
      const innerBlocks = flatParseBlocks(cleanInner)
      // Map 'ques' to 'exercise' for the callout type
      const calloutType = envName === 'ques' ? 'exercise' : envName
      return [{
        type: 'calloutBlock',
        attrs: { calloutType, title },
        content: innerBlocks.length > 0 ? innerBlocks : [{ type: 'paragraph' }],
      }]
    }

    // Unknown environment — preserve as rawLatex block (opaque passthrough)
    const endTag = `\\end{${envName}}`
    const fullEnv = trimmed.slice(0, endPos + endTag.length)
    return [{ type: 'rawLatex', attrs: { content: fullEnv } }]
  }

  // Plain text paragraph
  const content = parseInline(trimmed)
  if (content.length > 0) return [{ type: 'paragraph', content }]

  return []
}

function flatParseBlocks(body: string): JSONContent[] {
  const nodes: JSONContent[] = []
  const blocks = splitIntoBlocks(body)
  for (const block of blocks) {
    nodes.push(...parseBlock(block))
  }
  return nodes
}

function splitIntoBlocks(body: string): string[] {
  const blocks: string[] = []
  const lines = body.split('\n')
  let current: string[] = []

  function flushCurrent() {
    const text = current.join('\n').trim()
    if (text) {
      const parts = text.split(/\n\n+/)
      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed) blocks.push(trimmed)
      }
    }
    current = []
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Skip empty lines
    if (!trimmedLine) {
      flushCurrent()
      i++
      continue
    }

    // Standalone spacing/skip commands → preserve as rawLatex block
    if (/^\\(vspace|hspace|vfill|hfill|smallskip|medskip|bigskip|newpage|clearpage)\b/.test(trimmedLine)) {
      flushCurrent()
      blocks.push(trimmedLine)
      i++
      continue
    }

    // Environment: collect entire \begin{...}...\end{...}
    const envMatch = trimmedLine.match(/^\\begin\{([^}]+)\}/)
    if (envMatch) {
      flushCurrent()
      const envName = envMatch[1]
      const beginTag = `\\begin{${envName}}`
      const endTag = `\\end{${envName}}`
      let depth = 1
      const envLines: string[] = [line]
      i++
      while (i < lines.length) {
        const lt = lines[i].trim()
        if (lt.startsWith(beginTag)) depth++
        if (lt.startsWith(endTag)) depth--
        envLines.push(lines[i])
        if (depth === 0) break
        i++
      }
      blocks.push(envLines.join('\n'))
      i++
      continue
    }

    // Block math \[...\]
    if (trimmedLine.startsWith('\\[')) {
      flushCurrent()
      if (trimmedLine.includes('\\]')) {
        blocks.push(trimmedLine)
        i++
        continue
      }
      const mathLines: string[] = [line]
      i++
      while (i < lines.length) {
        mathLines.push(lines[i])
        if (lines[i].trim().includes('\\]')) break
        i++
      }
      blocks.push(mathLines.join('\n'))
      i++
      continue
    }

    // Display math $$...$$
    if (trimmedLine.startsWith('$$')) {
      flushCurrent()
      if (trimmedLine.endsWith('$$') && trimmedLine.length > 2) {
        blocks.push(trimmedLine)
        i++
        continue
      }
      const mathLines: string[] = [line]
      i++
      while (i < lines.length) {
        mathLines.push(lines[i])
        if (lines[i].trim().endsWith('$$')) break
        i++
      }
      blocks.push(mathLines.join('\n'))
      i++
      continue
    }

    // Heading commands
    if (/^\\(section|subsection|subsubsection|paragraph)\*?\{/.test(trimmedLine)) {
      flushCurrent()
      blocks.push(trimmedLine)
      i++
      continue
    }

    // Horizontal rule
    if (trimmedLine.startsWith('\\noindent\\rule') || trimmedLine === '\\hrule') {
      flushCurrent()
      blocks.push(trimmedLine)
      i++
      continue
    }

    // Regular line
    current.push(line)
    i++
  }

  flushCurrent()
  return blocks
}

// ─── Main Entry Point ────────────────────────────────────────────

function extractBody(latex: string): string {
  const normalized = normalize(latex)

  const beginDoc = normalized.indexOf('\\begin{document}')
  const endDoc = normalized.indexOf('\\end{document}')

  if (beginDoc !== -1) {
    const start = beginDoc + '\\begin{document}'.length
    const end = endDoc !== -1 ? endDoc : normalized.length
    return normalized.slice(start, end).trim()
  }

  return normalized.trim()
}

export function parseLatex(latex: string, extraCalloutNames?: Set<string>): JSONContent {
  // Build dynamic callout set: builtins + any extra names from preamble \newtheorem
  if (extraCalloutNames && extraCalloutNames.size > 0) {
    dynamicCalloutEnvs = new Set([...CALLOUT_ENVIRONMENTS, ...extraCalloutNames])
  } else {
    // Auto-detect from preamble if present
    const beginDoc = latex.indexOf('\\begin{document}')
    if (beginDoc !== -1) {
      const preamble = latex.slice(0, beginDoc)
      const defs = parseTheoremDefs(preamble)
      if (defs.length > 0) {
        dynamicCalloutEnvs = new Set([...CALLOUT_ENVIRONMENTS, ...defs.map(d => d.envName)])
      } else {
        dynamicCalloutEnvs = CALLOUT_ENVIRONMENTS
      }
    } else {
      dynamicCalloutEnvs = CALLOUT_ENVIRONMENTS
    }
  }

  const body = extractBody(latex)
  const content = flatParseBlocks(body)

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}

// ─── Preamble Extraction ──────────────────────────────────────────

const BASE_PACKAGES = new Set([
  'inputenc', 'fontenc', 'babel', 'amsmath', 'amssymb', 'amsfonts',
  'graphicx', 'hyperref', 'geometry',
])

const CUSTOM_LINE_RE = /^\\(newcommand|renewcommand|providecommand|def|DeclareMathOperator)\b/

/** Lines that are theorem/style declarations — managed by the generator, not custom preamble */
const THEOREM_LINE_RE = /^\\(newtheorem|theoremstyle)\b/

/**
 * Extract custom preamble definitions (\newcommand, \def, extra \usepackage)
 * from a LaTeX source so they can be preserved across the import round-trip.
 *
 * Also parses `\newtheorem` / `\theoremstyle` declarations and returns them as
 * structured `TheoremDef[]` — these lines are NOT included in `customPreamble`
 * because the generator manages them.
 */
export function extractCustomPreamble(latex: string): { customPreamble: string; theoremDefs: TheoremDef[] } {
  const beginDoc = latex.indexOf('\\begin{document}')
  if (beginDoc === -1) return { customPreamble: '', theoremDefs: [] }

  const preamble = latex.slice(0, beginDoc)
  const theoremDefs = parseTheoremDefs(preamble)

  const lines = preamble.split('\n')
  const customLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('%')) continue
    if (line.startsWith('\\documentclass')) continue

    // Extra \usepackage lines — filter out packages already in the base preamble
    if (line.startsWith('\\usepackage')) {
      const pkgMatch = line.match(/\\usepackage(\[[^\]]*\])?\{([^}]+)\}/)
      if (pkgMatch) {
        const opts = pkgMatch[1] ?? ''
        const pkgs = pkgMatch[2].split(',').map((p) => p.trim())
        const extra = pkgs.filter((p) => !BASE_PACKAGES.has(p))
        if (extra.length > 0) {
          customLines.push(`\\usepackage${opts}{${extra.join(',')}}`)
        }
      }
      continue
    }

    // Skip theorem/style declarations (managed by generator)
    if (THEOREM_LINE_RE.test(line)) {
      // Still need to consume multi-line definitions
      let depth = 0
      for (const ch of lines[i]) {
        if (ch === '{') depth++
        if (ch === '}') depth--
      }
      while (depth > 0 && i + 1 < lines.length) {
        i++
        for (const ch of lines[i]) {
          if (ch === '{') depth++
          if (ch === '}') depth--
        }
      }
      continue
    }

    // Custom definitions — may span multiple lines
    if (CUSTOM_LINE_RE.test(line)) {
      let fullLine = lines[i]
      let depth = 0
      for (const ch of fullLine) {
        if (ch === '{') depth++
        if (ch === '}') depth--
      }
      while (depth > 0 && i + 1 < lines.length) {
        i++
        fullLine += '\n' + lines[i]
        for (const ch of lines[i]) {
          if (ch === '{') depth++
          if (ch === '}') depth--
        }
      }
      customLines.push(fullLine)
    }
  }

  return { customPreamble: customLines.join('\n'), theoremDefs }
}

// ─── Snapshot Merge ──────────────────────────────────────────────
// After parsing edited LaTeX, merge with the original editor snapshot
// to preserve rich attributes that can't be derived from LaTeX alone.

/** Build a pool of nodes from a doc tree, indexed by type */
function collectNodesByType(doc: JSONContent): Map<string, JSONContent[]> {
  const pools = new Map<string, JSONContent[]>()

  function walk(node: JSONContent) {
    const type = node.type
    if (type) {
      if (!pools.has(type)) pools.set(type, [])
      pools.get(type)!.push(node)
    }
    if (node.content) {
      for (const child of node.content) {
        walk(child)
      }
    }
  }

  walk(doc)
  return pools
}

/**
 * Merge a freshly-parsed doc with the original editor snapshot to restore
 * rich attributes that are lost during the LaTeX round-trip:
 * - tikzFigure: shapes (visual editor representation, not derivable from tikzCode)
 * - image: src (base64 data), assetFilename (internal asset reference)
 * - pgfplotBlock: plotConfig is re-derived by the parser, but if parsing failed
 *   we fall back to the snapshot's plotConfig
 */
export function mergeWithSnapshot(newDoc: JSONContent, snapshot: JSONContent): JSONContent {
  const pools = collectNodesByType(snapshot)

  function mergeNode(node: JSONContent): JSONContent {
    let merged = node

    if (node.type === 'tikzFigure') {
      const pool = pools.get('tikzFigure')
      if (pool && pool.length > 0) {
        // Match by tikzCode similarity (positional: take first available)
        const match = pool.shift()!
        if (match.attrs?.shapes && match.attrs.shapes.length > 0) {
          merged = { ...node, attrs: { ...node.attrs, shapes: match.attrs.shapes } }
        }
      }
    }

    if (node.type === 'pgfplotBlock') {
      const pool = pools.get('pgfplotBlock')
      if (pool && pool.length > 0) {
        const match = pool.shift()!
        // If the parser couldn't derive a plotConfig, use the snapshot's
        if (!node.attrs?.plotConfig && match.attrs?.plotConfig) {
          merged = { ...node, attrs: { ...node.attrs, plotConfig: match.attrs.plotConfig } }
        }
      }
    }

    if (node.type === 'image') {
      const pool = pools.get('image')
      if (pool && pool.length > 0) {
        // Match: the parsed src might be the assetFilename from the snapshot
        // (generateLatex uses assetFilename in \includegraphics when src is base64)
        const matchIdx = pool.findIndex((n) => {
          const snapAsset = n.attrs?.assetFilename
          const snapSrc = n.attrs?.src
          const newSrc = node.attrs?.src
          // Exact src match
          if (snapSrc === newSrc) return true
          // Parser extracted assetFilename as src
          if (snapAsset && snapAsset === newSrc) return true
          return false
        })
        const idx = matchIdx >= 0 ? matchIdx : 0
        if (idx < pool.length) {
          const match = pool.splice(idx, 1)[0]
          merged = {
            ...node,
            attrs: {
              ...node.attrs,
              src: match.attrs?.src ?? node.attrs?.src,
              assetFilename: match.attrs?.assetFilename ?? node.attrs?.assetFilename,
            },
          }
        }
      }
    }

    // Recurse into children
    if (node.content) {
      merged = { ...merged, content: node.content.map(mergeNode) }
    }

    return merged
  }

  return mergeNode(newDoc)
}
