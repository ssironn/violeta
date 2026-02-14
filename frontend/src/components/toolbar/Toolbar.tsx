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
} from 'lucide-react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'
import { symbolGroups } from '../../data/symbolMap'
import { SPACING_OPTIONS } from '../../extensions/LatexSpacing'
import { ToolbarButton } from './ToolbarButton'
import { ToolbarDivider } from './ToolbarDivider'
import { HeadingDropdown } from './HeadingDropdown'
import { MathPanel } from './MathPanel'
import { insertLink } from '../../utils/insertHelpers'
import { exportTex } from '../../utils/exportTex'
import { downloadPdfBlob, compileAndDownload } from '../../utils/compilePdf'

interface ToolbarProps {
  editor: Editor
  latex: string
  pdfBlob: Blob | null
  onOpenMathEditor: (templateLatex: string) => void
  onOpenImageModal: () => void
  onUploadTex: () => void
  onOpenGoogleDrive?: () => void
  onGoHome: () => void
  onCompile: () => void
  pdfCompiling: boolean
  documentTitle?: string
  onTitleChange?: (title: string) => void
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
  onUploadTex,
  onOpenGoogleDrive,
  onGoHome,
  onCompile,
  pdfCompiling,
  documentTitle,
  onTitleChange,
}: ToolbarProps) {
  const [showSymbols, setShowSymbols] = useState(false)
  const [showMathTemplates, setShowMathTemplates] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [compileStatus, setCompileStatus] = useState('')

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
                <MenuSeparator />
                <MenuItem icon={<Sigma size={14} />} label="Equação matemática" onClick={() => onOpenMathEditor('')} />
                <MenuItem icon={<Minus size={14} />} label="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
                <MenuItem icon={<Quote size={14} />} label="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()} />
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
        </div>
      </div>

      {/* ═══ Row 2: Formatting toolbar ═══ */}
      <div className="gdocs-toolbar">
        {/* Undo / Redo */}
        <ToolbarButton
          icon={<Undo2 size={15} />}
          tooltip="Desfazer (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={<Redo2 size={15} />}
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
          icon={<Bold size={15} />}
          tooltip="Negrito (Ctrl+B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={<Italic size={15} />}
          tooltip="Itálico (Ctrl+I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={<Underline size={15} />}
          tooltip="Sublinhado (Ctrl+U)"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        <ToolbarDivider />

        {/* Lists & structure */}
        <ToolbarButton
          icon={<List size={15} />}
          tooltip="Lista com marcadores"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={<ListOrdered size={15} />}
          tooltip="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          icon={<AlignLeft size={15} />}
          tooltip="Alinhar à esquerda"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          icon={<AlignCenter size={15} />}
          tooltip="Centralizar"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          icon={<AlignRight size={15} />}
          tooltip="Alinhar à direita"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />

        <ToolbarDivider />

        {/* Insert shortcuts */}
        <ToolbarButton
          icon={<ImageIcon size={15} />}
          tooltip="Inserir imagem"
          onClick={onOpenImageModal}
        />
        <ToolbarButton
          icon={<Link2 size={15} />}
          tooltip="Inserir link"
          active={editor.isActive('link')}
          onClick={() => insertLink(editor)}
        />

        <ToolbarDivider />

        {/* Símbolos button */}
        <button
          onClick={() => { setShowSymbols(!showSymbols); setShowMathTemplates(false) }}
          className={`gdocs-symbols-btn ${showSymbols ? 'gdocs-symbols-btn--active' : ''}`}
        >
          <Sigma size={14} strokeWidth={2.2} />
          <span>Símbolos</span>
          <ChevronDown size={11} className={`transition-transform ${showSymbols ? 'rotate-180' : ''}`} />
        </button>
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
    </div>
  )
}
