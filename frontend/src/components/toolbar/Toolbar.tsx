import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/core'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  Link2,
  Download,
  Upload,
  FileText,
  Sigma,
  Quote,
  Minus,
  Loader2,
  HardDrive,
  ChevronDown,
  Undo2,
  Redo2,
  Play,
  Globe,
  Table2,
  Code2,
  Shapes,
  Settings,
  FileCode2,
  BookOpen,
  Lightbulb,
  GraduationCap,
  FlaskConical,
  PenLine,
  FunctionSquare,
  TrendingUp,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'
import { symbolGroups } from '../../data/symbolMap'
import { SPACING_OPTIONS } from '../../extensions/LatexSpacing'
import { ToolbarButton } from './ToolbarButton'
import { ToolbarDivider } from './ToolbarDivider'
import { HeadingDropdown } from './HeadingDropdown'
import { MathPanel } from './MathPanel'
import { DocumentConfigPanel } from './DocumentConfigPanel'
import { ThemePopover } from './ThemePopover'
import type { DocumentConfig } from '../../types/documentConfig'
import { insertLink } from '../../utils/insertHelpers'
import { exportTex } from '../../utils/exportTex'
import { downloadPdfBlob, compileAndDownload } from '../../utils/compilePdf'

export type ViewMode = 'document' | 'compilation' | 'code'

interface ToolbarProps {
  editor: Editor
  latex: string
  pdfBlob: Blob | null
  onOpenMathEditor: (templateLatex: string) => void
  onOpenImageModal: () => void
  onOpenTikzEditor?: () => void
  onOpenPlotEditor?: () => void
  onUploadTex: () => void
  onOpenGoogleDrive?: () => void
  onGoHome: () => void
  onCompile: () => void
  pdfCompiling: boolean
  documentTitle?: string
  onTitleChange?: (title: string) => void
  onPublish?: () => void
  documentConfig?: DocumentConfig
  onDocumentConfigChange?: (config: DocumentConfig) => void
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  showPdf?: boolean
  onTogglePdf?: () => void
  isMobile?: boolean
}

function SymbolCell({ display, onClick }: { display: string; onClick: () => void }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(display, ref.current, {
          throwOnError: false,
          displayMode: false,
          macros: { ...katexMacros },
          errorColor: '#7a6299',
        })
      } catch {
        if (ref.current) ref.current.textContent = display
      }
    }
  }, [display])

  return (
    <button onClick={onClick} className="symbol-cell" title={display}>
      <span ref={ref} className="symbol-cell-katex" />
    </button>
  )
}

/** Simple dropdown menu component for the menu bar */
function MenuDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`gdocs-menu-item ${open ? 'gdocs-menu-item--active' : ''}`}
      >
        {label}
      </button>
      {open && (
        <div className="gdocs-menu-dropdown" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, shortcut, onClick, disabled }: {
  icon?: React.ReactNode
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="gdocs-menu-dropdown-item"
    >
      <span className="gdocs-menu-dropdown-icon">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="gdocs-menu-dropdown-shortcut">{shortcut}</span>}
    </button>
  )
}

function MenuSeparator() {
  return <div className="gdocs-menu-dropdown-sep" />
}

export function Toolbar({
  editor,
  latex,
  pdfBlob,
  onOpenMathEditor,
  onOpenImageModal,
  onOpenTikzEditor,
  onOpenPlotEditor,
  onUploadTex,
  onOpenGoogleDrive,
  onGoHome,
  onCompile,
  pdfCompiling,
  documentTitle,
  onTitleChange,
  onPublish,
  documentConfig,
  onDocumentConfigChange,
  viewMode = 'document',
  onViewModeChange,
  showPdf = true,
  onTogglePdf,
  isMobile = false,
}: ToolbarProps) {
  const [showSymbols, setShowSymbols] = useState(false)
  const [showDocConfig, setShowDocConfig] = useState(false)
  const [showMathTemplates, setShowMathTemplates] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [_compileStatus, setCompileStatus] = useState('')

  async function handleDownloadPdf() {
    if (compiling) return
    if (pdfBlob) {
      downloadPdfBlob(pdfBlob)
      return
    }
    setCompiling(true)
    try {
      await compileAndDownload(latex, setCompileStatus)
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar PDF')
    } finally {
      setCompiling(false)
      setCompileStatus('')
    }
  }

  function insertSymbol(symbolLatex: string) {
    if (/\\(frac|sqrt|int|sum|prod|lim|partial|begin)/.test(symbolLatex)) {
      onOpenMathEditor(symbolLatex)
      setShowSymbols(false)
      return
    }
    editor.chain().focus().insertContent({
      type: 'inlineMath',
      attrs: { latex: symbolLatex },
    }).run()
  }

  return (
    <div className="flex-shrink-0">
      {/* ═══ Row 1: Menu bar ═══ */}
      <div className="gdocs-menubar">
        <div className="gdocs-menubar-left">
          {/* Doc icon (like the blue Google Docs icon) */}
          <button onClick={onGoHome} className="gdocs-doc-icon" title="Voltar ao início">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="2" width="14" height="20" rx="2" fill="currentColor" opacity="0.15" />
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Doc name + menus */}
          <div className="gdocs-doc-info">
            <input
              className="gdocs-doc-title"
              value={documentTitle || ''}
              placeholder="Documento sem título"
              onChange={(e) => onTitleChange?.(e.target.value)}
              onBlur={(e) => onTitleChange?.(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              spellCheck={false}
            />
            <nav className="gdocs-menus">
              <MenuDropdown label="Arquivo">
                <MenuItem icon={<Upload size={14} />} label="Importar .tex" onClick={onUploadTex} />
                <MenuItem icon={<Download size={14} />} label="Exportar .tex" onClick={() => exportTex(latex)} />
                <MenuItem
                  icon={compiling ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  label="Baixar PDF"
                  onClick={handleDownloadPdf}
                />
                {onOpenGoogleDrive && (
                  <>
                    <MenuSeparator />
                    <MenuItem icon={<HardDrive size={14} />} label="Google Drive" onClick={onOpenGoogleDrive} />
                  </>
                )}
              </MenuDropdown>

              <MenuDropdown label="Inserir">
                <MenuItem icon={<ImageIcon size={14} />} label="Imagem" onClick={onOpenImageModal} />
                <MenuItem icon={<Link2 size={14} />} label="Link" shortcut="Ctrl+K" onClick={() => insertLink(editor)} />
                <MenuItem icon={<Table2 size={14} />} label="Tabela" onClick={() => (editor.commands as any).insertLatexTable({ cols: 3, rows: 2 })} />
                <MenuSeparator />
                <MenuItem icon={<Sigma size={14} />} label="Equação matemática" onClick={() => onOpenMathEditor('')} />
                <MenuItem icon={<FunctionSquare size={14} />} label="Equação numerada" onClick={() => (editor.commands as any).insertMathEnvironment({ environment: 'equation', latex: '' })} />
                <MenuItem icon={<FunctionSquare size={14} />} label="Alinhar equações" onClick={() => (editor.commands as any).insertMathEnvironment({ environment: 'align*', latex: '' })} />
                <MenuItem icon={<FunctionSquare size={14} />} label="Casos (função por partes)" onClick={() => (editor.commands as any).insertMathEnvironment({ environment: 'cases', latex: '' })} />
                <MenuSeparator />
                <MenuItem icon={<Shapes size={14} />} label="Figuras Geométricas" onClick={() => onOpenTikzEditor?.()} />
                <MenuItem icon={<TrendingUp size={14} />} label="Gráfico de Funções" onClick={() => onOpenPlotEditor?.()} />
                <MenuItem icon={<Code2 size={14} />} label="Bloco de código" onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
                <MenuItem icon={<Minus size={14} />} label="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
                <MenuItem icon={<Quote size={14} />} label="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()} />
                <MenuItem icon={<FileCode2 size={14} />} label="LaTeX bruto" onClick={() => editor.chain().focus().insertRawLatex().run()} />
                <MenuSeparator />
                <MenuItem icon={<BookOpen size={14} />} label="Teorema" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'theorem' })} />
                <MenuItem icon={<Lightbulb size={14} />} label="Definição" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'definition' })} />
                <MenuItem icon={<BookOpen size={14} />} label="Lema" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'lemma' })} />
                <MenuItem icon={<PenLine size={14} />} label="Demonstração" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'proof' })} />
                <MenuItem icon={<BookOpen size={14} />} label="Corolário" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'corollary' })} />
                <MenuItem icon={<FlaskConical size={14} />} label="Exemplo" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'example' })} />
                <MenuItem icon={<GraduationCap size={14} />} label="Exercício" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'exercise' })} />
                <MenuItem icon={<Lightbulb size={14} />} label="Observação" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'remark' })} />
                <MenuItem icon={<BookOpen size={14} />} label="Proposição" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'proposition' })} />
                <MenuItem icon={<GraduationCap size={14} />} label="Questão" onClick={() => (editor.commands as any).insertCallout({ calloutType: 'questao' })} />
              </MenuDropdown>

              <MenuDropdown label="Formatar">
                <MenuItem icon={<Bold size={14} />} label="Negrito" shortcut="Ctrl+B" onClick={() => editor.chain().focus().toggleBold().run()} />
                <MenuItem icon={<Italic size={14} />} label="Itálico" shortcut="Ctrl+I" onClick={() => editor.chain().focus().toggleItalic().run()} />
                <MenuItem icon={<Underline size={14} />} label="Sublinhado" shortcut="Ctrl+U" onClick={() => editor.chain().focus().toggleUnderline().run()} />
                <MenuSeparator />
                <MenuItem icon={<AlignLeft size={14} />} label="Alinhar à esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()} />
                <MenuItem icon={<AlignCenter size={14} />} label="Centralizar" onClick={() => editor.chain().focus().setTextAlign('center').run()} />
                <MenuItem icon={<AlignRight size={14} />} label="Alinhar à direita" onClick={() => editor.chain().focus().setTextAlign('right').run()} />
              </MenuDropdown>
            </nav>
          </div>
        </div>

        <div className="gdocs-menubar-right">
          <ThemePopover />
          <button
            onClick={onCompile}
            disabled={pdfCompiling}
            className="gdocs-compile-btn"
            title="Compilar PDF"
          >
            {pdfCompiling ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            <span>{pdfCompiling ? 'Compilando...' : 'Compilar'}</span>
          </button>
          {onPublish && (
            <button
              onClick={onPublish}
              className="gdocs-compile-btn"
              style={{ background: 'var(--color-accent-500, #8b5cf6)' }}
              title="Publicar documento"
            >
              <Globe size={14} />
              <span>Publicar</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ Row 2: Formatting toolbar ═══ */}
      <div className="gdocs-toolbar">
        {/* Undo / Redo */}
        <ToolbarButton
          icon={<Undo2 size={14} />}
          tooltip="Desfazer (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={<Redo2 size={14} />}
          tooltip="Refazer (Ctrl+Y)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />

        <ToolbarDivider />

        {/* Heading dropdown */}
        <HeadingDropdown editor={editor} />

        <ToolbarDivider />

        {/* Text formatting */}
        <ToolbarButton
          icon={<Bold size={14} />}
          tooltip="Negrito (Ctrl+B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={<Italic size={14} />}
          tooltip="Itálico (Ctrl+I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={<Underline size={14} />}
          tooltip="Sublinhado (Ctrl+U)"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        <ToolbarDivider />

        {/* Lists & structure */}
        <ToolbarButton
          icon={<List size={14} />}
          tooltip="Lista com marcadores"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={<ListOrdered size={14} />}
          tooltip="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <ToolbarDivider />

        {/* Alignment — grouped pill */}
        <div className="toolbar-align-group">
          {([
            { align: 'left', icon: <AlignLeft size={13} />, label: 'Alinhar à esquerda' },
            { align: 'center', icon: <AlignCenter size={13} />, label: 'Centralizar' },
            { align: 'right', icon: <AlignRight size={13} />, label: 'Alinhar à direita' },
          ] as const).map(({ align, icon, label }) => {
            // Detect if an image node is selected
            const { selection } = editor.state
            const selectedNode = 'node' in selection ? (selection as any).node : null
            const isImageSelected = selectedNode?.type.name === 'image'
            const active = isImageSelected
              ? (selectedNode.attrs.alignment || 'center') === align
              : editor.isActive({ textAlign: align })
            return (
              <button
                key={align}
                title={label}
                onClick={() => {
                  if (isImageSelected) {
                    ;(editor.commands as any).updateImageBlock({
                      pos: (selection as any).from,
                      attrs: { alignment: align },
                    })
                  } else {
                    editor.chain().focus().setTextAlign(align).run()
                  }
                }}
                className={`toolbar-align-btn ${active ? 'toolbar-align-btn--active' : ''}`}
              >
                {icon}
              </button>
            )
          })}
        </div>

        <ToolbarDivider />

        {/* Insert shortcuts */}
        <ToolbarButton
          icon={<ImageIcon size={14} />}
          tooltip="Inserir imagem"
          onClick={onOpenImageModal}
        />
        <ToolbarButton
          icon={<Link2 size={14} />}
          tooltip="Inserir link"
          active={editor.isActive('link')}
          onClick={() => insertLink(editor)}
        />

        <ToolbarDivider />

        {/* Símbolos button */}
        <button
          onClick={() => { setShowSymbols(!showSymbols); setShowMathTemplates(false); setShowDocConfig(false) }}
          className={`gdocs-symbols-btn ${showSymbols ? 'gdocs-symbols-btn--active' : ''}`}
        >
          <Sigma size={13} strokeWidth={2.2} />
          <span>Símbolos</span>
          <ChevronDown size={11} className={`transition-transform ${showSymbols ? 'rotate-180' : ''}`} />
        </button>

        {/* Configurar documento button */}
        {documentConfig && onDocumentConfigChange && (
          <button
            onClick={() => { setShowDocConfig(!showDocConfig); setShowSymbols(false); setShowMathTemplates(false) }}
            className={`gdocs-symbols-btn ${showDocConfig ? 'gdocs-symbols-btn--active' : ''}`}
          >
            <Settings size={13} strokeWidth={2.2} />
            <span>Configurar</span>
            <ChevronDown size={11} className={`transition-transform ${showDocConfig ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Spacer to push right-side controls (hidden on mobile to allow wrap) */}
        {!isMobile && <div className="flex-1" />}

        {/* View mode segmented control — desktop only (mobile switch is in menubar) */}
        {onViewModeChange && !isMobile && (
          <div className="flex items-center rounded-md border border-surface-border overflow-hidden">
            <button
              onClick={() => onViewModeChange('document')}
              className={`px-2.5 py-1 text-[11px] font-medium transition-all ${
                viewMode === 'document'
                  ? 'bg-accent-600 text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              Documento
            </button>
            <button
              onClick={() => onViewModeChange('code')}
              className={`px-2.5 py-1 text-[11px] font-medium transition-all border-l border-surface-border ${
                viewMode === 'code'
                  ? 'bg-accent-600 text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              Código LaTeX
            </button>
          </div>
        )}

        {/* PDF panel toggle — desktop only */}
        {onTogglePdf && !isMobile && (
          <ToolbarButton
            icon={showPdf ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            tooltip={showPdf ? 'Ocultar painel PDF' : 'Mostrar painel PDF'}
            active={showPdf}
            onClick={onTogglePdf}
          />
        )}
      </div>

      {/* ═══ Símbolos panel (Row 3, expandable) ═══ */}
      {showSymbols && (
        <div className="symbols-panel">
          <div className="symbols-panel-inner">
            {symbolGroups.map((group) => (
              <div key={group.label} className="symbols-group">
                <h4 className="symbols-group-label">{group.label}</h4>
                <div className="symbols-grid">
                  {group.symbols.map((s) => (
                    <SymbolCell
                      key={s.latex}
                      display={s.display}
                      onClick={() => insertSymbol(s.latex)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Espaçamento group */}
            <div className="symbols-group">
              <h4 className="symbols-group-label">Espaçamento</h4>
              <div className="spacing-grid">
                {SPACING_OPTIONS.map((s) => (
                  <button
                    key={s.command}
                    className="spacing-cell"
                    title={s.description}
                    onClick={() => {
                      editor.chain().focus().insertLatexSpacing({
                        command: s.command,
                        label: s.label,
                        size: s.size,
                      }).run()
                    }}
                  >
                    <span className="spacing-cell-cmd">{s.command}</span>
                    <span className="spacing-cell-desc">{s.description.split('(')[0].trim()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDocConfig && documentConfig && onDocumentConfigChange && (
        <DocumentConfigPanel config={documentConfig} onChange={onDocumentConfigChange} />
      )}

      {showMathTemplates && (
        <MathPanel
          editor={editor}
          onClose={() => setShowMathTemplates(false)}
          onOpenMathEditor={(latex) => {
            setShowMathTemplates(false)
            onOpenMathEditor(latex)
          }}
        />
      )}

      {/* Mobile: view mode switch between toolbar and document */}
      {onViewModeChange && isMobile && (
        <div className="flex justify-center py-2 border-b border-surface-border bg-surface-primary">
          <div className="flex items-center rounded-md border border-surface-border overflow-hidden">
            {([
              { mode: 'document' as ViewMode, label: 'Documento' },
              { mode: 'compilation' as ViewMode, label: 'Compilação' },
              { mode: 'code' as ViewMode, label: 'LaTeX' },
            ]).map(({ mode, label }, i) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`px-3 py-1.5 text-[12px] font-medium transition-all ${
                  i > 0 ? 'border-l border-surface-border' : ''
                } ${
                  viewMode === mode
                    ? 'bg-accent-600 text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
