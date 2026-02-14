import { useState, useCallback } from 'react'
import { useVioletaEditor, type MathEditState } from './hooks/useVioletaEditor'
import { useLatexGenerator } from './hooks/useLatexGenerator'
import { usePdfCompiler } from './hooks/usePdfCompiler'
import { useLatexSync } from './hooks/useLatexSync'
import { parseLatex, extractCustomPreamble } from './latex/parseLatex'
import { updateKatexMacros } from './latex/katexMacros'
import { beautifyLatex } from './latex/beautifyLatex'
import { uploadTexFile } from './utils/uploadTex'
import { AppLayout } from './components/layout/AppLayout'
import { Sidebar } from './components/layout/Sidebar'
import { RightPanel } from './components/layout/RightPanel'
import { EditorArea } from './components/editor/EditorArea'
import { Toolbar } from './components/toolbar/Toolbar'
import { MathEditRouter } from './components/math-editors/MathEditRouter'
import { ImageInsertModal } from './components/editor/ImageInsertModal'

export default function App() {
  const [mathEdit, setMathEdit] = useState<MathEditState | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  const onMathClick = useCallback((state: MathEditState) => {
    setMathEdit(state)
  }, [])

  const editor = useVioletaEditor({ onMathClick })
  const [customPreamble, setCustomPreamble] = useState('')
  const generatedLatex = useLatexGenerator(editor, customPreamble)
  const [showCode, setShowCode] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Manual LaTeX editing state
  const [editingLatex, setEditingLatex] = useState(false)
  const [manualLatex, setManualLatex] = useState<string | null>(null)

  // Hover-to-highlight: tracks which math node is hovered in the editor
  const [hoveredMath, setHoveredMath] = useState<string | null>(null)

  // Bidirectional sync: when editing LaTeX manually, parse and update the visual editor
  useLatexSync(editor, manualLatex, editingLatex)

  // The effective latex: manual edits take priority when in edit mode
  const effectiveLatex = editingLatex && manualLatex !== null ? manualLatex : generatedLatex

  // LaTeX compilation via texlive.net API
  const { pdfUrl, pdfBlob, compiling: pdfCompiling, error: pdfError, autoCompile, setAutoCompile, compile } = usePdfCompiler(effectiveLatex)

  function handleToggleEditing() {
    if (!editingLatex) {
      // Entering edit mode — beautify the LaTeX first
      setManualLatex(beautifyLatex(generatedLatex))
    } else {
      // Leaving edit mode — parse final manual LaTeX into editor
      if (manualLatex !== null && editor) {
        const preamble = extractCustomPreamble(manualLatex)
        setCustomPreamble(preamble)
        updateKatexMacros(preamble)
        const doc = parseLatex(manualLatex)
        editor.commands.setContent(doc)
      }
      setManualLatex(null)
    }
    setEditingLatex(!editingLatex)
  }

  function handleLatexChange(latex: string) {
    setManualLatex(latex)
  }

  function handleUploadTex() {
    uploadTexFile((content) => {
      if (!editor) return
      const preamble = extractCustomPreamble(content)
      setCustomPreamble(preamble)
      updateKatexMacros(preamble)
      const doc = parseLatex(content)
      editor.commands.setContent(doc)
      // If in edit mode, update the manual LaTeX display with beautified version
      if (editingLatex) {
        setManualLatex(beautifyLatex(content))
      }
    })
  }

  // Called from MathPanel when user picks a template — opens the modal in insert mode
  const openMathEditor = useCallback((templateLatex: string) => {
    if (!editor) return
    setMathEdit({
      latex: templateLatex,
      pos: editor.state.selection.from,
      type: 'inlineMath',
      mode: 'insert',
    })
  }, [editor])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="text-text-muted text-sm">Carregando editor...</div>
      </div>
    )
  }

  function handleMathSave(newLatex: string) {
    if (!mathEdit) return

    if (mathEdit.mode === 'insert') {
      // Insert new math node at cursor position
      editor!.chain().focus().insertContent({
        type: 'inlineMath',
        attrs: { latex: newLatex },
      }).run()
    } else {
      // Update existing math node
      const cmd = mathEdit.type === 'inlineMath' ? 'updateInlineMath' : 'updateBlockMath'
      ;(editor!.commands as any)[cmd]({ latex: newLatex, pos: mathEdit.pos })
    }

    setMathEdit(null)
    editor!.commands.focus()
  }

  function handleMathDelete() {
    if (!mathEdit) return
    if (mathEdit.mode === 'edit') {
      const cmd = mathEdit.type === 'inlineMath' ? 'deleteInlineMath' : 'deleteBlockMath'
      ;(editor!.commands as any)[cmd]({ pos: mathEdit.pos })
    }
    setMathEdit(null)
    editor!.commands.focus()
  }

  return (
    <>
      <AppLayout
        toolbar={
          <Toolbar
            editor={editor}
            latex={effectiveLatex}
            pdfBlob={pdfBlob}
            showCode={showCode}
            onToggleCode={() => setShowCode(!showCode)}
            onOpenMathEditor={openMathEditor}
            onOpenImageModal={() => setImageModalOpen(true)}
            onUploadTex={handleUploadTex}
          />
        }
        sidebar={
          <Sidebar
            editor={editor}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        }
        editor={<EditorArea editor={editor} onOpenMathEditor={openMathEditor} onOpenImageModal={() => setImageModalOpen(true)} onHoverMath={setHoveredMath} />}
        rightPanel={
          <RightPanel
            latex={effectiveLatex}
            editingLatex={editingLatex}
            onToggleEditing={handleToggleEditing}
            onLatexChange={handleLatexChange}
            highlightedMath={hoveredMath}
            pdfUrl={pdfUrl}
            pdfCompiling={pdfCompiling}
            pdfError={pdfError}
            autoCompile={autoCompile}
            onSetAutoCompile={setAutoCompile}
            onCompile={compile}
          />
        }
        showCode={showCode}
      />
      {mathEdit && (
        <MathEditRouter
          initialLatex={mathEdit.latex}
          onSave={handleMathSave}
          onDelete={handleMathDelete}
          onClose={() => setMathEdit(null)}
          isInsert={mathEdit.mode === 'insert'}
        />
      )}
      {imageModalOpen && (
        <ImageInsertModal
          onInsert={(src, alt) => {
            editor!.chain().focus().setImage({ src, alt }).run()
            setImageModalOpen(false)
          }}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </>
  )
}
