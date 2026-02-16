import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Pencil,
  Eye,
  Play,
  RotateCw,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Replace,
  CaseSensitive,
  Regex,
} from 'lucide-react'
import { beautifyLatex } from '../../latex/beautifyLatex'

type Tab = 'pdf' | 'code'

interface RightPanelProps {
  latex: string
  editingLatex: boolean
  onToggleEditing: () => void
  onLatexChange: (latex: string) => void
  highlightedMath: string | null
  pdfUrl: string | null
  pdfCompiling: boolean
  pdfError: string | null
  autoCompile: boolean
  onSetAutoCompile: (v: boolean) => void
  onCompile: () => void
}

/* ── Syntax highlighting ── */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function syntaxHighlight(code: string): string {
  return escapeHtml(code)
    .replace(/(\\[a-zA-Z@]+)/g, '<span class="latex-cmd">$1</span>')
    .replace(/(\{|\})/g, '<span class="latex-brace">$1</span>')
    .replace(/(%.+)/g, '<span class="latex-comment">$1</span>')
    .replace(/(\[|\])/g, '<span class="latex-bracket">$1</span>')
    .replace(/(\$\$?)/g, '<span class="latex-math-delim">$1</span>')
}

/* ── Search utilities ── */

interface SearchState {
  query: string
  caseSensitive: boolean
  useRegex: boolean
  showReplace: boolean
  replaceText: string
}

function findAllMatches(text: string, search: SearchState): { start: number; end: number }[] {
  if (!search.query) return []
  try {
    let pattern: RegExp
    if (search.useRegex) {
      pattern = new RegExp(search.query, search.caseSensitive ? 'g' : 'gi')
    } else {
      const escaped = search.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(escaped, search.caseSensitive ? 'g' : 'gi')
    }
    const matches: { start: number; end: number }[] = []
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      if (m[0].length === 0) { pattern.lastIndex++; continue }
      matches.push({ start: m.index, end: m.index + m[0].length })
    }
    return matches
  } catch {
    return []
  }
}

/* ── Highlighted code with search marks ── */

function highlightWithSearch(
  code: string,
  hoveredMath: string | null,
  matches: { start: number; end: number }[],
  activeMatchIndex: number
): string {
  // First, handle hovered math highlighting
  let baseCode = code
  let mathHighlightStart = -1
  let mathHighlightEnd = -1

  if (hoveredMath) {
    const needle = `$${hoveredMath}$`
    const idx = baseCode.indexOf(needle)
    if (idx !== -1) {
      mathHighlightStart = idx
      mathHighlightEnd = idx + needle.length
    }
  }

  if (matches.length === 0 && mathHighlightStart === -1) {
    return syntaxHighlight(code)
  }

  // Build segments with all highlights
  type Segment = { text: string; type: 'normal' | 'search' | 'search-active' | 'math-hover' }
  const segments: Segment[] = []

  // Merge all highlight ranges
  type Range = { start: number; end: number; type: 'search' | 'search-active' | 'math-hover' }
  const ranges: Range[] = []

  if (mathHighlightStart !== -1) {
    ranges.push({ start: mathHighlightStart, end: mathHighlightEnd, type: 'math-hover' })
  }

  matches.forEach((m, i) => {
    ranges.push({ start: m.start, end: m.end, type: i === activeMatchIndex ? 'search-active' : 'search' })
  })

  // Sort by start position
  ranges.sort((a, b) => a.start - b.start)

  let cursor = 0
  for (const range of ranges) {
    if (range.start < cursor) continue // skip overlapping
    if (range.start > cursor) {
      segments.push({ text: code.slice(cursor, range.start), type: 'normal' })
    }
    segments.push({ text: code.slice(range.start, range.end), type: range.type })
    cursor = range.end
  }
  if (cursor < code.length) {
    segments.push({ text: code.slice(cursor), type: 'normal' })
  }

  return segments.map(seg => {
    const highlighted = syntaxHighlight(seg.text)
    switch (seg.type) {
      case 'search':
        return `<mark class="latex-search-match">${highlighted}</mark>`
      case 'search-active':
        return `<mark class="latex-search-active">${highlighted}</mark>`
      case 'math-hover':
        return `<mark class="latex-math-hover">${highlighted}</mark>`
      default:
        return highlighted
    }
  }).join('')
}

/* ── Line-numbered code display ── */

function CodeWithLineNumbers({
  code,
  hoveredMath,
  matches,
  activeMatchIndex,
  activeMatchLine,
}: {
  code: string
  hoveredMath: string | null
  matches: { start: number; end: number }[]
  activeMatchIndex: number
  activeMatchLine: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lines = code.split('\n')

  // Scroll active match line into view
  useEffect(() => {
    if (activeMatchLine >= 0 && containerRef.current) {
      const lineEl = containerRef.current.querySelector(`[data-line="${activeMatchLine}"]`)
      lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeMatchLine, activeMatchIndex])

  // Build per-line highlighted HTML
  const lineHtmls = useMemo(() => {
    // highlight each line individually by mapping matches to lines
    const lineOffsets: number[] = []
    let offset = 0
    for (const line of lines) {
      lineOffsets.push(offset)
      offset += line.length + 1 // +1 for \n
    }

    return lines.map((line, i) => {
      const lineStart = lineOffsets[i]
      const lineEnd = lineStart + line.length
      const lineMatches = matches
        .filter(m => m.start < lineEnd && m.end > lineStart)
        .map(m => ({
          start: Math.max(0, m.start - lineStart),
          end: Math.min(line.length, m.end - lineStart),
        }))

      // Find math hover range for this line
      let lineHoveredMath: string | null = null
      if (hoveredMath) {
        const needle = `$${hoveredMath}$`
        const idx = code.indexOf(needle)
        if (idx !== -1 && idx < lineEnd && idx + needle.length > lineStart) {
          lineHoveredMath = hoveredMath
        }
      }

      // Determine the global match index for matches on this line
      const globalMatchIndices = matches
        .map((m, idx) => ({ ...m, globalIdx: idx }))
        .filter(m => m.start < lineEnd && m.end > lineStart)

      const localActiveIdx = globalMatchIndices.findIndex(m => m.globalIdx === activeMatchIndex)

      return highlightWithSearch(
        line,
        lineHoveredMath,
        lineMatches,
        localActiveIdx
      )
    })
  }, [code, hoveredMath, matches, activeMatchIndex, lines])

  return (
    <div ref={containerRef} className="latex-code-container flex-1 overflow-auto">
      <div className="latex-code-table">
        {lineHtmls.map((html, i) => (
          <div
            key={i}
            data-line={i}
            className={`latex-code-line ${i === activeMatchLine ? 'latex-code-line--active' : ''}`}
          >
            <span className="latex-line-number">{i + 1}</span>
            <span
              className="latex-line-content"
              dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Editable code with line numbers ── */

function EditableCodeArea({
  value,
  onChange,
  textareaRef,
}: {
  value: string
  onChange: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const gutterRef = useRef<HTMLDivElement>(null)
  const lines = value.split('\n')

  const handleScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [textareaRef])

  // Handle tab key in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }, [value, onChange])

  return (
    <div className="latex-editor-area flex-1 overflow-hidden relative">
      {/* Line number gutter */}
      <div ref={gutterRef} className="latex-editor-gutter">
        {lines.map((_, i) => (
          <div key={i} className="latex-editor-gutter-line">{i + 1}</div>
        ))}
      </div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="latex-editor-textarea"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  )
}

/* ── Search Bar ── */

function SearchBar({
  search,
  onSearchChange,
  matchCount,
  activeMatchIndex,
  onPrev,
  onNext,
  onClose,
  onReplace,
  onReplaceAll,
}: {
  search: SearchState
  onSearchChange: (s: Partial<SearchState>) => void
  matchCount: number
  activeMatchIndex: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onReplace: () => void
  onReplaceAll: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onNext() }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onPrev() }
  }

  return (
    <div className="latex-search-bar animate-slide-up">
      {/* Find row */}
      <div className="latex-search-row">
        <div className="latex-search-input-wrap">
          <Search size={13} className="latex-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={search.query}
            onChange={(e) => onSearchChange({ query: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Buscar..."
            className="latex-search-input"
            spellCheck={false}
          />
          {search.query && (
            <span className="latex-search-count">
              {matchCount > 0 ? `${activeMatchIndex + 1}/${matchCount}` : 'Sem resultados'}
            </span>
          )}
        </div>

        <div className="latex-search-actions">
          <button
            onClick={() => onSearchChange({ caseSensitive: !search.caseSensitive })}
            className={`latex-search-toggle ${search.caseSensitive ? 'latex-search-toggle--active' : ''}`}
            title="Diferenciar maiúsculas (Alt+C)"
          >
            <CaseSensitive size={14} />
          </button>
          <button
            onClick={() => onSearchChange({ useRegex: !search.useRegex })}
            className={`latex-search-toggle ${search.useRegex ? 'latex-search-toggle--active' : ''}`}
            title="Expressão regular (Alt+R)"
          >
            <Regex size={14} />
          </button>

          <div className="latex-search-nav-divider" />

          <button onClick={onPrev} disabled={matchCount === 0} className="latex-search-nav" title="Anterior (Shift+Enter)">
            <ChevronUp size={14} />
          </button>
          <button onClick={onNext} disabled={matchCount === 0} className="latex-search-nav" title="Próximo (Enter)">
            <ChevronDown size={14} />
          </button>

          <button
            onClick={() => onSearchChange({ showReplace: !search.showReplace })}
            className={`latex-search-toggle ${search.showReplace ? 'latex-search-toggle--active' : ''}`}
            title="Substituir"
          >
            <Replace size={14} />
          </button>

          <button onClick={onClose} className="latex-search-close" title="Fechar (Esc)">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Replace row */}
      {search.showReplace && (
        <div className="latex-search-row latex-replace-row">
          <div className="latex-search-input-wrap">
            <Replace size={13} className="latex-search-icon" />
            <input
              type="text"
              value={search.replaceText}
              onChange={(e) => onSearchChange({ replaceText: e.target.value })}
              placeholder="Substituir por..."
              className="latex-search-input"
              spellCheck={false}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
            />
          </div>
          <div className="latex-search-actions">
            <button
              onClick={onReplace}
              disabled={matchCount === 0}
              className="latex-replace-btn"
              title="Substituir"
            >
              Substituir
            </button>
            <button
              onClick={onReplaceAll}
              disabled={matchCount === 0}
              className="latex-replace-btn"
              title="Substituir todos"
            >
              Todos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */

export function RightPanel({
  latex,
  editingLatex,
  onToggleEditing,
  onLatexChange,
  highlightedMath,
  pdfUrl,
  pdfCompiling: compiling,
  pdfError: error,
  autoCompile,
  onSetAutoCompile,
  onCompile,
}: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('pdf')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [search, setSearch] = useState<SearchState>({
    query: '',
    caseSensitive: false,
    useRegex: false,
    showReplace: false,
    replaceText: '',
  })
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)

  const beautified = useMemo(() => beautifyLatex(latex), [latex])
  const displayCode = editingLatex ? latex : beautified

  // Compute matches
  const matches = useMemo(
    () => findAllMatches(displayCode, search),
    [displayCode, search.query, search.caseSensitive, search.useRegex]
  )

  // Keep active index in bounds
  useEffect(() => {
    if (activeMatchIndex >= matches.length) {
      setActiveMatchIndex(matches.length > 0 ? 0 : 0)
    }
  }, [matches.length, activeMatchIndex])

  // Compute active match line
  const activeMatchLine = useMemo(() => {
    if (matches.length === 0 || activeMatchIndex >= matches.length) return -1
    const match = matches[activeMatchIndex]
    const textBefore = displayCode.slice(0, match.start)
    return textBefore.split('\n').length - 1
  }, [matches, activeMatchIndex, displayCode])

  // Keyboard shortcut: Ctrl+F / Cmd+F
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && tab === 'code') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tab])

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(latex).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [latex])

  const handleSearchChange = useCallback((partial: Partial<SearchState>) => {
    setSearch(prev => ({ ...prev, ...partial }))
    if ('query' in partial) setActiveMatchIndex(0)
  }, [])

  const handleSearchClose = useCallback(() => {
    setShowSearch(false)
    setSearch(prev => ({ ...prev, query: '' }))
  }, [])

  const handlePrev = useCallback(() => {
    setActiveMatchIndex(prev => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  const handleNext = useCallback(() => {
    setActiveMatchIndex(prev => (prev + 1) % matches.length)
  }, [matches.length])

  const handleReplace = useCallback(() => {
    if (!editingLatex || matches.length === 0) return
    const match = matches[activeMatchIndex]
    const newLatex = latex.slice(0, match.start) + search.replaceText + latex.slice(match.end)
    onLatexChange(newLatex)
  }, [editingLatex, matches, activeMatchIndex, latex, search.replaceText, onLatexChange])

  const handleReplaceAll = useCallback(() => {
    if (!editingLatex || matches.length === 0) return
    // Replace from end to start to preserve indices
    let newLatex = latex
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i]
      newLatex = newLatex.slice(0, match.start) + search.replaceText + newLatex.slice(match.end)
    }
    onLatexChange(newLatex)
    setActiveMatchIndex(0)
  }, [editingLatex, matches, latex, search.replaceText, onLatexChange])

  const lineCount = useMemo(() => displayCode.split('\n').length, [displayCode])

  return (
    <div className="w-full bg-surface-panel flex flex-col flex-shrink-0">
      {/* Tab bar */}
      <div className="flex items-center border-b border-surface-border">
        <button
          onClick={() => setTab('pdf')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-all ${
            tab === 'pdf'
              ? 'text-accent-500 border-b-2 border-accent-500 bg-accent-500/5'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            PDF
            {compiling && <Loader2 size={11} className="animate-spin" />}
          </span>
        </button>
        <button
          onClick={() => setTab('code')}
          className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-all ${
            tab === 'code'
              ? 'text-accent-500 border-b-2 border-accent-500 bg-accent-500/5'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          LaTeX
        </button>
      </div>

      {/* PDF tab */}
      {tab === 'pdf' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Compile controls bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border/50">
            <button
              onClick={onCompile}
              disabled={compiling}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all bg-accent-600 hover:bg-accent-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-accent-600/20"
            >
              {compiling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              <span>{compiling ? 'Compilando...' : 'Compilar'}</span>
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <span className="text-[11px] text-text-muted">Auto</span>
              <button
                onClick={() => onSetAutoCompile(!autoCompile)}
                className={`relative w-7 h-4 rounded-full transition-colors ${
                  autoCompile ? 'bg-accent-500' : 'bg-surface-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
                    autoCompile ? 'translate-x-3' : ''
                  }`}
                />
              </button>
            </label>
          </div>

          {compiling && !pdfUrl && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
              <Loader2 size={24} className="animate-spin text-accent-400" />
              <span className="text-xs">Compilando via texlive.net...</span>
            </div>
          )}

          {error && !pdfUrl && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle size={24} className="text-red-400" />
              <span className="text-xs text-red-300">Erro ao compilar</span>
              <span className="text-[11px] text-text-muted leading-relaxed">{error}</span>
            </div>
          )}

          {pdfUrl && (
            <div className="flex-1 relative min-h-0">
              {compiling && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-elevated/90 border border-surface-border text-[10px] text-accent-500">
                  <RotateCw size={10} className="animate-spin" />
                  Recompilando...
                </div>
              )}
              <iframe
                src={pdfUrl}
                className="absolute inset-0 w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          )}

          {!compiling && !error && !pdfUrl && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-muted px-6 text-center">
              <div className="flex flex-col gap-2">
                <span className="text-xs">Clique em <strong className="text-accent-500">Compilar</strong> para gerar o PDF.</span>
                <span className="text-[11px] text-text-muted/70 leading-relaxed">
                  O preview mostrado aqui é o resultado final compilado pelo servidor texlive.net.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code tab */}
      {tab === 'code' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Code header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border/50">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleEditing}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${
                  editingLatex
                    ? 'text-accent-500 bg-accent-500/15 border border-accent-500/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent'
                }`}
              >
                {editingLatex ? (
                  <>
                    <Pencil size={11} />
                    <span>Modo Leitura</span>
                  </>
                ) : (
                  <>
                    <Eye size={11} />
                    <span>Habilitar Edição</span>
                  </>
                )}
              </button>

              <span className="text-[10px] text-text-muted/50 tabular-nums">
                {lineCount} linhas
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-all ${
                  showSearch
                    ? 'text-accent-500 bg-accent-500/15'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
                title="Buscar (Ctrl+F)"
              >
                <Search size={12} />
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                title="Copiar código"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-success" />
                    <span className="text-success">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <SearchBar
              search={search}
              onSearchChange={handleSearchChange}
              matchCount={matches.length}
              activeMatchIndex={activeMatchIndex}
              onPrev={handlePrev}
              onNext={handleNext}
              onClose={handleSearchClose}
              onReplace={handleReplace}
              onReplaceAll={handleReplaceAll}
            />
          )}

          {/* Code content */}
          {editingLatex ? (
            <EditableCodeArea
              value={latex}
              onChange={onLatexChange}
              textareaRef={textareaRef}
            />
          ) : (
            <CodeWithLineNumbers
              code={beautified}
              hoveredMath={highlightedMath}
              matches={showSearch ? matches : []}
              activeMatchIndex={activeMatchIndex}
              activeMatchLine={showSearch ? activeMatchLine : -1}
            />
          )}
        </div>
      )}
    </div>
  )
}
