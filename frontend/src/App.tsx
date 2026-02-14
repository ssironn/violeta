import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { SharedDocumentView } from './components/documents/SharedDocumentView'
import { ShareModal } from './components/documents/ShareModal'
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
import { GoogleDriveModal } from './components/google/GoogleDriveModal'
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument } from './api/documents'
import type { DocumentListItem } from './api/documents'

function EditorApp() {
  const [mathEdit, setMathEdit] = useState<MathEditState | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  // Document management state
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [currentDocId, setCurrentDocId] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [googleDriveModalOpen, setGoogleDriveModalOpen] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Load documents on mount
  useEffect(() => {
    listDocuments().then(setDocuments).catch(console.error)
  }, [])

  // Auto-save with debounce
  useEffect(() => {
    if (!editor || !currentDocId) return
    const docId = currentDocId
    const handler = () => {
      const content = editor.getJSON()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        updateDocument(docId, { content }).catch(console.error)
      }, 2000)
    }
    editor.on('update', handler)
    return () => {
      editor.off('update', handler)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [editor, currentDocId])

  async function handleSelectDocument(id: string) {
    try {
      const doc = await getDocument(id)
      setCurrentDocId(id)
      if (editor) {
        editor.commands.setContent(doc.content || { type: 'doc', content: [{ type: 'paragraph' }] })
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateDocument() {
    try {
      const doc = await createDocument()
      setDocuments(prev => [doc, ...prev])
      handleSelectDocument(doc.id)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDeleteDocument(id: string) {
    try {
      await deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
      if (currentDocId === id) {
        setCurrentDocId(null)
        if (editor) editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] })
      }
    } catch (err) {
      console.error(err)
    }
  }

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
            onOpenGoogleDrive={() => setGoogleDriveModalOpen(true)}
          />
        }
        sidebar={
          <Sidebar
            editor={editor}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            documents={documents}
            currentDocId={currentDocId}
            onSelectDocument={handleSelectDocument}
            onCreateDocument={handleCreateDocument}
            onDeleteDocument={handleDeleteDocument}
            onShareDocument={(id) => {
              setCurrentDocId(id)
              setShareModalOpen(true)
            }}
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
      {googleDriveModalOpen && (
        <GoogleDriveModal
          currentDocId={currentDocId}
          onDocumentImported={() => {
            listDocuments().then(setDocuments).catch(console.error)
          }}
          onClose={() => setGoogleDriveModalOpen(false)}
        />
      )}
      {shareModalOpen && currentDocId && (
        <ShareModal
          docId={currentDocId}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [shareToken, setShareToken] = useState<string | null>(null)

  useEffect(() => {
    const match = window.location.pathname.match(/^\/shared\/(.+)$/)
    if (match) setShareToken(match[1])
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="text-text-muted text-sm">Loading...</div>
      </div>
    )
  }

  if (shareToken) {
    return <SharedDocumentView shareToken={shareToken} user={user} />
  }

  if (!user) {
    return <LoginPage />
  }

  return <EditorApp />
}
