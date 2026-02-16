import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  Copy,
  Check,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Replace,
  CaseSensitive,
  Regex,
} from 'lucide-react'

interface LatexCodePanelProps {
  latex: string
  onLatexChange: (v: string) => void
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
  const highlightRef = useRef<HTMLPreElement>(null)
  const lines = value.split('\n')

  const highlighted = useMemo(() => syntaxHighlight(value) + '\n', [value])

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      if (gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop
      }
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
      }
    }
  }, [textareaRef])

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
      <div ref={gutterRef} className="latex-editor-gutter">
        {lines.map((_, i) => (
          <div key={i} className="latex-editor-gutter-line">{i + 1}</div>
        ))}
      </div>
      <div className="latex-editor-highlight-wrap">
        <pre
          ref={highlightRef}
          className="latex-editor-highlight"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
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

export function LatexCodePanel({ latex, onLatexChange }: LatexCodePanelProps) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [showSearch, setShowSearch] = useState(false)
  const [search, setSearch] = useState<SearchState>({
    query: '',
    caseSensitive: false,
    useRegex: false,
    showReplace: false,
    replaceText: '',
  })
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)

  const matches = useMemo(
    () => findAllMatches(latex, search),
    [latex, search.query, search.caseSensitive, search.useRegex]
  )

  useEffect(() => {
    if (activeMatchIndex >= matches.length) {
      setActiveMatchIndex(0)
    }
  }, [matches.length, activeMatchIndex])

  // Keyboard shortcut: Ctrl+F / Cmd+F
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    if (matches.length === 0) return
    const match = matches[activeMatchIndex]
    const newLatex = latex.slice(0, match.start) + search.replaceText + latex.slice(match.end)
    onLatexChange(newLatex)
  }, [matches, activeMatchIndex, latex, search.replaceText, onLatexChange])

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) return
    let newLatex = latex
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i]
      newLatex = newLatex.slice(0, match.start) + search.replaceText + newLatex.slice(match.end)
    }
    onLatexChange(newLatex)
    setActiveMatchIndex(0)
  }, [matches, latex, search.replaceText, onLatexChange])

  const lineCount = useMemo(() => latex.split('\n').length, [latex])

  return (
    <div className="w-full h-full bg-surface-panel flex flex-col">
      {/* Code header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border/50">
        <div className="flex items-center gap-2">
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

      {/* Code content — always editable */}
      <EditableCodeArea
        value={latex}
        onChange={onLatexChange}
        textareaRef={textareaRef}
      />
    </div>
  )
}
