import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { Plus, Search } from 'lucide-react'
import { slashCommandItems, type SlashCommandItem } from '../../extensions/SlashCommands'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'

interface Props {
  editor: Editor
  onOpenMathEditor: (latex: string) => void
  onOpenImageModal: () => void
  onOpenTikzEditor?: () => void
  onOpenPlotEditor?: () => void
}

function MiniPreview({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, { throwOnError: false, displayMode: false, macros: { ...katexMacros }, errorColor: '#7a6299' })
    } catch {
      ref.current.textContent = latex
    }
  }, [latex])
  return <span ref={ref} className="[&_.katex]:text-[0.75em] text-gray-500" />
}

export function BlockInsertMenu({ editor, onOpenMathEditor, onOpenImageModal, onOpenTikzEditor, onOpenPlotEditor }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [buttonPos, setButtonPos] = useState<{ top: number } | null>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef(new Map<number, HTMLButtonElement>())

  useEffect(() => {
    const update = () => {
      if (!editor.isFocused) {
        return
      }

      const { selection } = editor.state
      const { $from } = selection

      try {
        const startPos = $from.start($from.depth)
        const coords = editor.view.coordsAtPos(startPos)
        const editorRect = editor.view.dom.getBoundingClientRect()

        setButtonPos({
          top: coords.top - editorRect.top,
        })
      } catch {
        setButtonPos(null)
      }
    }

    update()
    editor.on('selectionUpdate', update)
    editor.on('focus', update)
    editor.on('blur', () => setButtonPos(null))

    return () => {
      editor.off('selectionUpdate', update)
      editor.off('focus', update)
      editor.off('blur', () => setButtonPos(null))
    }
  }, [editor])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Auto-focus search input when menu opens
  useEffect(() => {
    if (menuOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Small delay to ensure the input is rendered
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [menuOpen])

  // Filter items based on query
  const items = useMemo(() => {
    if (!query) return slashCommandItems
    const q = query.toLowerCase()
    return slashCommandItems.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true
      if (item.aliases?.some((a) => a.toLowerCase().includes(q))) return true
      if (item.category.toLowerCase().includes(q)) return true
      return false
    })
  }, [query])

  // Reset selectedIndex when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Group items by category
  const categories = useMemo(() => {
    const cats: { label: string; items: { item: SlashCommandItem; globalIndex: number }[] }[] = []
    const map = new Map<string, typeof cats[number]>()
    items.forEach((item, idx) => {
      let cat = map.get(item.category)
      if (!cat) {
        cat = { label: item.category, items: [] }
        map.set(item.category, cat)
        cats.push(cat)
      }
      cat.items.push({ item, globalIndex: idx })
    })
    return cats
  }, [items])

  const executeCommand = useCallback((item: SlashCommandItem) => {
    item.action(editor, { onOpenMathEditor, onOpenImageModal, onOpenTikzEditor, onOpenPlotEditor })
    setMenuOpen(false)
  }, [editor, onOpenMathEditor, onOpenImageModal, onOpenTikzEditor, onOpenPlotEditor])

  // Keyboard navigation inside the search input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
        break
      case 'Enter':
        e.preventDefault()
        if (items[selectedIndex]) {
          executeCommand(items[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setMenuOpen(false)
        editor.commands.focus()
        break
    }
  }, [items, selectedIndex, executeCommand, editor])

  if (!buttonPos) return null

  // Prevent clicks on the menu from blurring the editor
  const preventBlur = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{ top: buttonPos.top, left: 24 }}
      onMouseDown={preventBlur}
    >
      <button
        ref={buttonRef}
        onClick={() => setMenuOpen(!menuOpen)}
        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
          menuOpen
            ? 'text-accent-600 bg-accent-500/15 rotate-45'
            : 'text-text-muted hover:text-accent-500 hover:bg-surface-hover'
        }`}
        title="Inserir componente"
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 top-8 z-50 bg-surface-elevated border border-surface-border rounded-xl shadow-xl shadow-accent-900/10 w-72 flex flex-col"
          style={{ maxHeight: 'min(420px, 60vh)' }}
        >
          {/* Search input */}
          <div className="px-2 pt-2 pb-1 flex-shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-panel border border-surface-border focus-within:border-accent-500/50 transition-colors">
              <Search size={14} className="text-text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar componente..."
                className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
              />
            </div>
          </div>

          {/* Items list */}
          <div className="overflow-auto py-1 flex-1 min-h-0">
            {items.length === 0 ? (
              <div className="px-3 py-4 text-xs text-text-muted text-center">
                Nenhum resultado para "{query}"
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat.label}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none">
                    {cat.label}
                  </div>
                  {cat.items.map(({ item, globalIndex }) => {
                    const Icon = item.icon
                    const isSelected = globalIndex === selectedIndex
                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          if (el) itemRefs.current.set(globalIndex, el)
                          else itemRefs.current.delete(globalIndex)
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                          isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                        }`}
                        onClick={() => executeCommand(item)}
                      >
                        <Icon size={16} className="text-text-muted shrink-0" />
                        <span className="text-[13px] text-text-primary truncate">{item.label}</span>
                        {item.latex && <MiniPreview latex={item.latex} />}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
