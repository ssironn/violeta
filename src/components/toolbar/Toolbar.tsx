import { useState } from 'react'
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
  Code2,
  Download,
  Upload,
  FileText,
  Sigma,
  Quote,
  Minus,
  Loader2,
} from 'lucide-react'
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
  showCode: boolean
  onToggleCode: () => void
  onOpenMathEditor: (templateLatex: string) => void
  onOpenImageModal: () => void
  onUploadTex: () => void
}

export function Toolbar({ editor, latex, pdfBlob, showCode, onToggleCode, onOpenMathEditor, onOpenImageModal, onUploadTex }: ToolbarProps) {
  const [showMath, setShowMath] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [compileStatus, setCompileStatus] = useState('')

  async function handleDownloadPdf() {
    if (compiling) return

    // Reuse cached PDF blob if available
    if (pdfBlob) {
      downloadPdfBlob(pdfBlob)
      return
    }

    // Fallback: compile from source
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

  return (
    <div className="flex-shrink-0">
      <div className="bg-surface-panel border-b border-surface-border px-3 py-1.5 flex items-center gap-0.5 flex-wrap">
        <HeadingDropdown editor={editor} />

        <ToolbarDivider />

        <ToolbarButton
          icon={<Bold size={16} />}
          tooltip="Negrito (Ctrl+B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={<Italic size={16} />}
          tooltip="Itálico (Ctrl+I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={<Underline size={16} />}
          tooltip="Sublinhado (Ctrl+U)"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={<List size={16} />}
          tooltip="Lista com marcadores"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={<ListOrdered size={16} />}
          tooltip="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon={<Quote size={16} />}
          tooltip="Citação"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={<Minus size={16} />}
          tooltip="Linha horizontal"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={<AlignLeft size={16} />}
          tooltip="Alinhar à esquerda"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          icon={<AlignCenter size={16} />}
          tooltip="Centralizar"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          icon={<AlignRight size={16} />}
          tooltip="Alinhar à direita"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={<ImageIcon size={16} />}
          tooltip="Inserir imagem"
          onClick={onOpenImageModal}
        />
        <ToolbarButton
          icon={<Link2 size={16} />}
          tooltip="Inserir link"
          active={editor.isActive('link')}
          onClick={() => insertLink(editor)}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={<Sigma size={16} />}
          tooltip="Matemática"
          active={showMath}
          onClick={() => setShowMath(!showMath)}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={<Code2 size={16} />}
          tooltip="Mostrar/ocultar código LaTeX"
          active={showCode}
          onClick={onToggleCode}
        />
        <ToolbarButton
          icon={<Upload size={16} />}
          tooltip="Carregar arquivo .tex"
          onClick={onUploadTex}
        />
        <ToolbarButton
          icon={<Download size={16} />}
          tooltip="Exportar .tex"
          onClick={() => exportTex(latex)}
        />
        <ToolbarButton
          icon={compiling ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          tooltip={compileStatus || 'Baixar PDF'}
          onClick={handleDownloadPdf}
        />
      </div>

      {showMath && (
        <MathPanel
          editor={editor}
          onClose={() => setShowMath(false)}
          onOpenMathEditor={(latex) => {
            setShowMath(false)
            onOpenMathEditor(latex)
          }}
        />
      )}
    </div>
  )
}
