import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'
import { searchSymbols } from '../../data/symbolMap'
import type { SearchPluginState } from '../../extensions/SearchHighlight'

interface DocumentSearchBarProps {
  searchState: SearchPluginState
  setQuery: (query: string) => void
  next: () => void
  prev: () => void
  close: () => void
}

function SymbolSuggestion({ name, display, onClick }: { name: string; display: string; onClick: () => void }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(display, ref.current, {
          throwOnError: false,
          displayMode: false,
          macros: { ...katexMacros },
        })
      } catch {
        if (ref.current) ref.current.textContent = display
      }
    }
  }, [display])

  return (
    <button className="doc-search-symbol-item" onClick={onClick}>
      <span ref={ref} className="doc-search-symbol-preview" />
      <span className="doc-search-symbol-name">\\{name}</span>
    </button>
  )
}

export function DocumentSearchBar({ searchState, setQuery, next, prev, close }: DocumentSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = searchSymbols(searchState.query)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close suggestions when query changes to something with no results
  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && searchState.query.length >= 2)
  }, [suggestions.length, searchState.query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        prev()
      } else {
        next()
      }
    }
  }, [close, next, prev])

  const handleSuggestionClick = useCallback((latex: string) => {
    setQuery(latex)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [setQuery])

  if (!searchState.active) return null

  const { matches, activeIndex, query } = searchState
  const matchCount = matches.length
  const matchLabel = query
    ? matchCount > 0
      ? `${activeIndex + 1}/${matchCount}`
      : '0/0'
    : ''

  return (
    <div className="doc-search-bar">
      <div className="doc-search-bar-inner">
        <input
          ref={inputRef}
          type="text"
          className="doc-search-input"
          placeholder="Buscar no documento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        {matchLabel && (
          <span className="doc-search-count">{matchLabel}</span>
        )}
        <button
          className="doc-search-nav-btn"
          onClick={prev}
          disabled={matchCount === 0}
          title="Anterior (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>
        <button
          className="doc-search-nav-btn"
          onClick={next}
          disabled={matchCount === 0}
          title="Próximo (Enter)"
        >
          <ChevronDown size={14} />
        </button>
        <button
          className="doc-search-close-btn"
          onClick={close}
          title="Fechar (Esc)"
        >
          <X size={14} />
        </button>
      </div>

      {showSuggestions && (
        <div className="doc-search-symbol-dropdown">
          {suggestions.slice(0, 6).map((s) => (
            <SymbolSuggestion
              key={s.latex}
              name={s.name}
              display={s.display}
              onClick={() => handleSuggestionClick(s.latex)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
