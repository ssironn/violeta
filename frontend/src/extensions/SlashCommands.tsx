import { useEffect, useRef, useState, useMemo } from 'react'
import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import katex from 'katex'
import { katexMacros } from '../latex/katexMacros'
import {
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  FunctionSquare,
  ImageIcon,
  Code2,
  Minus,
  FileCode2,
  Table2,
  BookOpen,
  Lightbulb,
  GraduationCap,
  FlaskConical,
  PenLine,
  Shapes,
  Link2,
  TrendingUp,
} from 'lucide-react'
import { mathTemplates } from './mathTemplates'
import { insertLink } from '../utils/insertHelpers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlashCommandCallbacks {
  onOpenMathEditor?: (latex: string) => void
  onOpenImageModal?: () => void
  onOpenTikzEditor?: () => void
  onOpenPlotEditor?: () => void
}

export interface SlashCommandItem {
  id: string
  label: string
  category: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  action: (editor: Editor, callbacks: SlashCommandCallbacks) => void
  aliases?: string[]
  latex?: string
}

export interface SlashCommandState {
  active: boolean
  query: string
  range: { from: number; to: number } | null
  decorationPosition: { top: number; bottom: number; left: number } | null
}

// ---------------------------------------------------------------------------
// Alias helper for math templates
// ---------------------------------------------------------------------------

function getMathAliases(id: string): string[] {
  const aliasMap: Record<string, string[]> = {
    fraction: ['fração', 'fraction', 'frac'],
    sqrt: ['raiz', 'root', 'sqrt'],
    nthroot: ['raiz', 'root', 'nth'],
    superscript: ['potencia', 'power', 'expoente', 'sup'],
    subscript: ['indice', 'sub'],
    integral: ['integral'],
    sum: ['soma', 'somatorio', 'sum', 'sigma'],
    product: ['produto', 'produtorio', 'product', 'pi'],
    limit: ['limite', 'lim'],
    matrix2x2: ['matriz', 'matrix', '2x2'],
    matrix3x3: ['matriz', 'matrix', '3x3'],
    derivative: ['derivada', 'derivative'],
    partial: ['parcial', 'partial'],
    doubleintegral: ['integral', 'dupla', 'double'],
  }
  return aliasMap[id] ?? []
}

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------

export const slashCommandItems: SlashCommandItem[] = [
  // -- Texto --
  {
    id: 'paragraph',
    label: 'Paragrafo',
    category: 'Texto',
    icon: Pilcrow,
    aliases: ['texto', 'text', 'paragrafo'],
    action: (editor) => {
      editor.chain().focus().setParagraph().run()
    },
  },
  {
    id: 'heading1',
    label: 'Titulo 1',
    category: 'Texto',
    icon: Heading1,
    aliases: ['h1', 'titulo', 'heading'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 1 }).run()
    },
  },
  {
    id: 'heading2',
    label: 'Titulo 2',
    category: 'Texto',
    icon: Heading2,
    aliases: ['h2', 'titulo', 'heading'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 2 }).run()
    },
  },
  {
    id: 'heading3',
    label: 'Titulo 3',
    category: 'Texto',
    icon: Heading3,
    aliases: ['h3', 'titulo', 'heading'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 3 }).run()
    },
  },

  // -- Listas --
  {
    id: 'bulletList',
    label: 'Lista',
    category: 'Listas',
    icon: List,
    aliases: ['lista', 'bullet', 'ul'],
    action: (editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    id: 'orderedList',
    label: 'Lista numerada',
    category: 'Listas',
    icon: ListOrdered,
    aliases: ['numerada', 'ordered', 'ol', 'numero'],
    action: (editor) => {
      editor.chain().focus().toggleOrderedList().run()
    },
  },
  {
    id: 'blockquote',
    label: 'Citacao',
    category: 'Listas',
    icon: Quote,
    aliases: ['quote', 'citacao', 'blockquote'],
    action: (editor) => {
      editor.chain().focus().toggleBlockquote().run()
    },
  },

  // -- Matematica --
  {
    id: 'blockMath',
    label: 'Equacao',
    category: 'Matematica',
    icon: FunctionSquare,
    aliases: ['equacao', 'equation', 'math', 'formula'],
    latex: 'E = mc^{2}',
    action: (_editor, { onOpenMathEditor }) => {
      onOpenMathEditor?.('')
    },
  },

  // Math templates from mathTemplates.ts
  ...mathTemplates.map((t): SlashCommandItem => ({
    id: `math-${t.id}`,
    label: t.label,
    category: 'Matematica',
    icon: FunctionSquare,
    latex: t.latex,
    aliases: getMathAliases(t.id),
    action: (_editor, { onOpenMathEditor }) => {
      onOpenMathEditor?.(t.latex)
    },
  })),

  // -- Equacoes (named math environments) --
  {
    id: 'equation',
    label: 'Equação numerada',
    category: 'Equacoes',
    icon: FunctionSquare,
    aliases: ['equation', 'equacao', 'numerada'],
    latex: 'E = mc^{2}',
    action: (editor) => {
      (editor.commands as any).insertMathEnvironment({ environment: 'equation', latex: '' })
    },
  },
  {
    id: 'equation-star',
    label: 'Equação (sem número)',
    category: 'Equacoes',
    icon: FunctionSquare,
    aliases: ['equation*', 'equacao', 'sem numero'],
    latex: 'E = mc^{2}',
    action: (editor) => {
      (editor.commands as any).insertMathEnvironment({ environment: 'equation*', latex: '' })
    },
  },
  {
    id: 'align',
    label: 'Alinhar equações',
    category: 'Equacoes',
    icon: FunctionSquare,
    aliases: ['align', 'alinhar', 'alinhamento', 'multi'],
    latex: 'a &= b \\\\ c &= d',
    action: (editor) => {
      (editor.commands as any).insertMathEnvironment({ environment: 'align*', latex: '' })
    },
  },
  {
    id: 'gather',
    label: 'Reunir equações',
    category: 'Equacoes',
    icon: FunctionSquare,
    aliases: ['gather', 'reunir', 'centralizar'],
    latex: 'x + y = z',
    action: (editor) => {
      (editor.commands as any).insertMathEnvironment({ environment: 'gather*', latex: '' })
    },
  },
  {
    id: 'cases',
    label: 'Casos (função por partes)',
    category: 'Equacoes',
    icon: FunctionSquare,
    aliases: ['cases', 'casos', 'partes', 'piecewise'],
    latex: '\\begin{cases} x & y \\end{cases}',
    action: (editor) => {
      (editor.commands as any).insertMathEnvironment({ environment: 'cases', latex: '' })
    },
  },

  // -- Tabela --
  {
    id: 'table',
    label: 'Tabela',
    category: 'Midia',
    icon: Table2,
    aliases: ['tabela', 'table', 'tabular', 'grid'],
    action: (editor) => {
      (editor.commands as any).insertLatexTable({ cols: 3, rows: 2 })
    },
  },

  // -- Ambientes (callout blocks) --
  {
    id: 'theorem',
    label: 'Teorema',
    category: 'Ambientes',
    icon: BookOpen,
    aliases: ['teorema', 'theorem', 'teo'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'theorem' })
    },
  },
  {
    id: 'definition',
    label: 'Definição',
    category: 'Ambientes',
    icon: Lightbulb,
    aliases: ['definicao', 'definition', 'def'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'definition' })
    },
  },
  {
    id: 'lemma',
    label: 'Lema',
    category: 'Ambientes',
    icon: BookOpen,
    aliases: ['lema', 'lemma'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'lemma' })
    },
  },
  {
    id: 'proof',
    label: 'Demonstração',
    category: 'Ambientes',
    icon: PenLine,
    aliases: ['demonstracao', 'prova', 'proof'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'proof' })
    },
  },
  {
    id: 'corollary',
    label: 'Corolário',
    category: 'Ambientes',
    icon: BookOpen,
    aliases: ['corolario', 'corollary'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'corollary' })
    },
  },
  {
    id: 'example',
    label: 'Exemplo',
    category: 'Ambientes',
    icon: FlaskConical,
    aliases: ['exemplo', 'example'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'example' })
    },
  },
  {
    id: 'exercise',
    label: 'Exercício',
    category: 'Ambientes',
    icon: GraduationCap,
    aliases: ['exercicio', 'exercise'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'exercise' })
    },
  },
  {
    id: 'remark',
    label: 'Observação',
    category: 'Ambientes',
    icon: Lightbulb,
    aliases: ['observacao', 'remark', 'obs'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'remark' })
    },
  },
  {
    id: 'proposition',
    label: 'Proposição',
    category: 'Ambientes',
    icon: BookOpen,
    aliases: ['proposicao', 'proposition', 'prop'],
    action: (editor) => {
      (editor.commands as any).insertCallout({ calloutType: 'proposition' })
    },
  },

  // -- Midia --
  {
    id: 'image',
    label: 'Imagem',
    category: 'Midia',
    icon: ImageIcon,
    aliases: ['imagem', 'img', 'foto', 'picture'],
    action: (_editor, { onOpenImageModal }) => {
      onOpenImageModal?.()
    },
  },
  {
    id: 'link',
    label: 'Link',
    category: 'Midia',
    icon: Link2,
    aliases: ['link', 'url', 'href', 'hiperlink'],
    action: (editor) => {
      insertLink(editor)
    },
  },
  {
    id: 'codeBlock',
    label: 'Bloco de codigo',
    category: 'Midia',
    icon: Code2,
    aliases: ['code', 'codigo', 'pre'],
    action: (editor) => {
      editor.chain().focus().toggleCodeBlock().run()
    },
  },
  {
    id: 'horizontalRule',
    label: 'Linha horizontal',
    category: 'Midia',
    icon: Minus,
    aliases: ['hr', 'linha', 'divisor', 'separator', 'separador'],
    action: (editor) => {
      editor.chain().focus().setHorizontalRule().run()
    },
  },

  {
    id: 'tikzFigure',
    label: 'Figuras Geométricas',
    category: 'Midia',
    icon: Shapes,
    aliases: ['tikz', 'figura', 'geometria', 'desenho', 'forma', 'tikzpicture'],
    action: (_editor, { onOpenTikzEditor }) => {
      onOpenTikzEditor?.()
    },
  },
  {
    id: 'pgfplot',
    label: 'Gráfico de Funções',
    category: 'Midia',
    icon: TrendingUp,
    aliases: ['grafico', 'plot', 'funcao', 'pgfplots', 'chart', 'graph'],
    action: (_editor, { onOpenPlotEditor }) => {
      onOpenPlotEditor?.()
    },
  },

  // -- Avancado --
  {
    id: 'rawLatex',
    label: 'LaTeX bruto',
    category: 'Avancado',
    icon: FileCode2,
    aliases: ['latex', 'raw', 'tex'],
    action: (editor) => {
      editor.chain().focus().insertRawLatex().run()
    },
  },
]

// ---------------------------------------------------------------------------
// ProseMirror Plugin
// ---------------------------------------------------------------------------

interface SlashPluginState {
  active: boolean
  query: string
  range: { from: number; to: number } | null
}

const slashCommandPluginKey = new PluginKey<SlashPluginState>('slashCommands')

const INACTIVE: SlashPluginState = { active: false, query: '', range: null }

function createSlashCommandPlugin(extensionStorage: SlashCommandState) {
  return new Plugin<SlashPluginState>({
    key: slashCommandPluginKey,

    state: {
      init(): SlashPluginState {
        return INACTIVE
      },
      apply(_tr, _prev, _oldState, newState): SlashPluginState {
        const { selection } = newState
        const { $from } = selection

        // Only trigger at cursor (empty selection)
        if (!selection.empty) return INACTIVE

        // Must be in a paragraph
        if ($from.parent.type.name !== 'paragraph') return INACTIVE

        const textContent = $from.parent.textContent

        // Check if paragraph text starts with "/"
        if (!textContent.startsWith('/')) return INACTIVE

        const startOfParagraph = $from.start($from.depth)
        const query = textContent.slice(1) // everything after "/"

        // Cursor must be at or after the "/" character
        const cursorOffset = $from.pos - startOfParagraph
        if (cursorOffset < 1) return INACTIVE

        return {
          active: true,
          query,
          range: {
            from: startOfParagraph,
            to: startOfParagraph + textContent.length,
          },
        }
      },
    },

    view() {
      return {
        update(view: EditorView) {
          const pluginState = slashCommandPluginKey.getState(view.state)
          if (!pluginState) return

          extensionStorage.active = pluginState.active
          extensionStorage.query = pluginState.query
          extensionStorage.range = pluginState.range

          if (pluginState.active && pluginState.range) {
            try {
              const coords = view.coordsAtPos(pluginState.range.from)
              extensionStorage.decorationPosition = {
                top: coords.top,
                bottom: coords.bottom + 4,
                left: coords.left,
              }
            } catch {
              extensionStorage.decorationPosition = null
            }
          } else {
            extensionStorage.decorationPosition = null
          }
        },
      }
    },
  })
}

// ---------------------------------------------------------------------------
// TipTap Extension
// ---------------------------------------------------------------------------

interface SlashCommandsOptions {
  onOpenMathEditor?: (latex: string) => void
  onOpenImageModal?: () => void
  onOpenTikzEditor?: () => void
  onOpenPlotEditor?: () => void
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      onOpenMathEditor: undefined,
      onOpenImageModal: undefined,
      onOpenTikzEditor: undefined,
      onOpenPlotEditor: undefined,
    }
  },

  addStorage() {
    return {
      active: false,
      query: '',
      range: null,
      decorationPosition: null,
    } as SlashCommandState
  },

  addProseMirrorPlugins() {
    return [createSlashCommandPlugin(this.storage as SlashCommandState)]
  },
})

// ---------------------------------------------------------------------------
// KaTeX mini preview component
// ---------------------------------------------------------------------------

function KatexPreview({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, {
        throwOnError: false,
        displayMode: false,
        macros: { ...katexMacros },
        errorColor: '#7a6299',
      })
    } catch {
      if (ref.current) ref.current.textContent = latex
    }
  }, [latex])

  return <span ref={ref} className="[&_.katex]:text-[0.7em] text-text-muted ml-auto shrink-0" />
}

// ---------------------------------------------------------------------------
// React Component: SlashCommandMenu
// ---------------------------------------------------------------------------

interface SlashCommandMenuProps {
  editor: Editor
  onOpenMathEditor?: (latex: string) => void
  onOpenImageModal?: () => void
  onOpenTikzEditor?: () => void
  onOpenPlotEditor?: () => void
}

export function SlashCommandMenu({ editor, onOpenMathEditor, onOpenImageModal, onOpenTikzEditor, onOpenPlotEditor }: SlashCommandMenuProps) {
  const [active, setActive] = useState(false)
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<{ from: number; to: number } | null>(null)
  const [position, setPosition] = useState<{ top: number; bottom: number; left: number } | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // Read storage state on every editor transaction
  useEffect(() => {
    const syncState = () => {
      const storage = (editor.storage as unknown as Record<string, unknown>).slashCommands as
        | SlashCommandState
        | undefined
      if (!storage) return

      setActive(storage.active)
      setQuery(storage.query)
      setRange(storage.range)
      setPosition(storage.decorationPosition)
    }

    syncState()
    editor.on('transaction', syncState)
    return () => {
      editor.off('transaction', syncState)
    }
  }, [editor])

  // Filter items based on query
  const items = useMemo(() => {
    if (!query) return slashCommandItems
    const q = query.toLowerCase()
    return slashCommandItems.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true
      if (item.aliases?.some((a) => a.toLowerCase().includes(q))) return true
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

  // Execute a command
  const executeCommand = (item: SlashCommandItem) => {
    if (!range) return

    // Delete the "/" text from the document
    editor.chain().focus().deleteRange({ from: range.from, to: range.to }).run()

    // Execute the action
    item.action(editor, { onOpenMathEditor, onOpenImageModal, onOpenTikzEditor, onOpenPlotEditor })
  }

  // Keyboard handler: intercept keys when menu is active
  useEffect(() => {
    if (!active || items.length === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          event.stopPropagation()
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return
        }
        case 'ArrowUp': {
          event.preventDefault()
          event.stopPropagation()
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
          return
        }
        case 'Enter': {
          event.preventDefault()
          event.stopPropagation()
          // Read selectedIndex from the current state via a ref-like approach
          // Since we're in a closure, `items` and `selectedIndex` may be stale.
          // We handle this by adding them to the dependency array and re-attaching.
          const item = items[selectedIndex]
          if (item) {
            executeCommand(item)
          }
          return
        }
        case 'Escape': {
          event.preventDefault()
          event.stopPropagation()
          // Delete the "/" text so the menu closes
          if (range) {
            editor.chain().focus().deleteRange({ from: range.from, to: range.to }).run()
          }
          return
        }
      }
    }

    // Capture phase so we intercept before TipTap/ProseMirror
    const editorDom = editor.view.dom
    editorDom.addEventListener('keydown', handleKeyDown, true)
    return () => {
      editorDom.removeEventListener('keydown', handleKeyDown, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, items, selectedIndex, range, editor])

  if (!active || !position || items.length === 0) return null

  // Group items by category preserving insertion order
  const categories: {
    label: string
    items: { item: SlashCommandItem; globalIndex: number }[]
  }[] = []
  const categoryMap = new Map<
    string,
    { label: string; items: { item: SlashCommandItem; globalIndex: number }[] }
  >()

  items.forEach((item, idx) => {
    let cat = categoryMap.get(item.category)
    if (!cat) {
      cat = { label: item.category, items: [] }
      categoryMap.set(item.category, cat)
      categories.push(cat)
    }
    cat.items.push({ item, globalIndex: idx })
  })

  // Prevent clicks from blurring the editor
  const preventBlur = (e: React.MouseEvent) => e.preventDefault()

  // Compute final position: flip upward if not enough space below
  const MENU_MAX_HEIGHT = 320 // max-h-80 = 20rem = 320px
  const GAP = 4
  const spaceBelow = window.innerHeight - position.bottom
  const openAbove = spaceBelow < MENU_MAX_HEIGHT && position.top > spaceBelow
  const finalTop = openAbove ? undefined : position.bottom
  const finalBottom = openAbove ? window.innerHeight - position.top + GAP : undefined
  // Clamp left so the menu doesn't overflow the right edge
  const menuWidth = 288 // w-72 = 18rem = 288px
  const finalLeft = Math.min(position.left, window.innerWidth - menuWidth - 8)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-surface-elevated rounded-xl shadow-xl shadow-accent-900/10 border border-surface-border w-72 max-h-80 overflow-auto py-1"
      style={{ top: finalTop, bottom: finalBottom, left: finalLeft }}
      onMouseDown={preventBlur}
    >
      {categories.map((cat) => (
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
                {item.latex && <KatexPreview latex={item.latex} />}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
