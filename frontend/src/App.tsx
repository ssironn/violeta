import { useState, useCallback, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { SharedDocumentView } from './components/documents/SharedDocumentView'
import { ShareModal } from './components/documents/ShareModal'
import { HomeScreen } from './components/home/HomeScreen'
import { useVioletaEditor, type MathEditState } from './hooks/useVioletaEditor'
import { useLatexGenerator } from './hooks/useLatexGenerator'
import { usePdfCompiler } from './hooks/usePdfCompiler'
import { useLatexSync } from './hooks/useLatexSync'
import { parseLatex, extractCustomPreamble } from './latex/parseLatex'
import { generateLatex } from './latex/generateLatex'
import { updateKatexMacros } from './latex/katexMacros'
import { beautifyLatex } from './latex/beautifyLatex'
import { uploadTexFile } from './utils/uploadTex'
import { useDocumentAssets } from './hooks/useDocumentAssets'
import { AppLayout } from './components/layout/AppLayout'
import { RightPanel } from './components/layout/RightPanel'
import { EditorArea } from './components/editor/EditorArea'
import { Toolbar } from './components/toolbar/Toolbar'
import { MathEditRouter } from './components/math-editors/MathEditRouter'
import { ImageInsertModal } from './components/editor/ImageInsertModal'
import { GoogleDriveModal } from './components/google/GoogleDriveModal'
import { getDocument, updateDocument, listDocuments } from './api/documents'

/** Requires auth — redirects to /signin if not logged in */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <h1 className="font-serif text-2xl font-medium text-text-primary tracking-wide">Violeta</h1>
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/signin" replace />
  return <>{children}</>
}

/** Redirects to / if already logged in */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <h1 className="font-serif text-2xl font-medium text-text-primary tracking-wide">Violeta</h1>
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) return <Navigate to="/" replace />

  return <EditorApp initialDocId={id} onGoHome={() => navigate('/')} />
}

function EditorApp({ initialDocId, onGoHome }: { initialDocId: string; onGoHome: () => void }) {
  const [mathEdit, setMathEdit] = useState<MathEditState | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  const [currentDocId] = useState<string | null>(initialDocId)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [googleDriveModalOpen, setGoogleDriveModalOpen] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onMathClick = useCallback((state: MathEditState) => {
    setMathEdit(state)
  }, [])

  const editor = useVioletaEditor({ onMathClick })
  const { registerAsset, registerUploadedFile, clearAssets, getCompileAssets } = useDocumentAssets()
  const [customPreamble, setCustomPreamble] = useState('')
  const generatedLatex = useLatexGenerator(editor, customPreamble)

  // Manual LaTeX editing state
  const [editingLatex, setEditingLatex] = useState(false)
  const [manualLatex, setManualLatex] = useState<string | null>(null)

  // Hover-to-highlight
  const [hoveredMath, setHoveredMath] = useState<string | null>(null)

  useLatexSync(editor, manualLatex, editingLatex)

  const effectiveLatex = editingLatex && manualLatex !== null ? manualLatex : generatedLatex

  const { pdfUrl, pdfBlob, compiling: pdfCompiling, error: pdfError, autoCompile, setAutoCompile, compile } = usePdfCompiler(effectiveLatex, getCompileAssets)

  function handleToggleEditing() {
    if (!editingLatex) {
      setManualLatex(beautifyLatex(generatedLatex))
    } else {
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
    uploadTexFile((result) => {
      if (!editor) return
      // Register imported assets (images, .bib, etc.)
      clearAssets()
      for (const asset of result.assets) {
        registerAsset(asset)
      }
      const content = result.tex
      const preamble = extractCustomPreamble(content)
      setCustomPreamble(preamble)
      updateKatexMacros(preamble)
      const doc = parseLatex(content)
      editor.commands.setContent(doc)
      if (editingLatex) {
        setManualLatex(beautifyLatex(content))
      }
    })
  }

  const openMathEditor = useCallback((templateLatex: string) => {
    if (!editor) return
    setMathEdit({
      latex: templateLatex,
      pos: editor.state.selection.from,
      type: 'inlineMath',
      mode: 'insert',
    })
  }, [editor])

  // Load initial document
  useEffect(() => {
    if (initialDocId && editor) {
      getDocument(initialDocId)
        .then(doc => {
          setDocumentTitle(doc.title || '')
          const content = doc.content as Record<string, any>
          if (content?.type === 'latex' && typeof content.source === 'string') {
            // New format: raw LaTeX source — parse into visual editor
            const preamble = extractCustomPreamble(content.source)
            setCustomPreamble(preamble)
            updateKatexMacros(preamble)
            const parsed = parseLatex(content.source)
            editor.commands.setContent(parsed)
          } else if (content?.type === 'doc') {
            // Legacy format: TipTap JSON — load directly
            editor.commands.setContent(content)
          } else {
            editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] })
          }
        })
        .catch(console.error)
    }
  }, [initialDocId, editor])

  // Auto-save content as LaTeX source with debounce
  useEffect(() => {
    if (!editor || !currentDocId) return
    const docId = currentDocId
    const handler = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const latexSource = generateLatex(editor.getJSON(), customPreamble)
        const content = { type: 'latex', source: latexSource }
        updateDocument(docId, { content }).catch(console.error)
      }, 2000)
    }
    editor.on('update', handler)
    return () => {
      editor.off('update', handler)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [editor, currentDocId, customPreamble])

  function handleTitleChange(title: string) {
    setDocumentTitle(title)
    if (!currentDocId) return
    const docId = currentDocId
    if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current)
    titleSaveTimerRef.current = setTimeout(() => {
      updateDocument(docId, { title: title || 'Untitled' }).catch(console.error)
    }, 800)
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <h1 className="font-serif text-2xl font-medium text-text-primary tracking-wide">Violeta</h1>
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  function handleMathSave(newLatex: string) {
    if (!mathEdit) return
    if (mathEdit.mode === 'insert') {
      editor!.chain().focus().insertContent({
        type: 'inlineMath',
        attrs: { latex: newLatex },
      }).run()
    } else {
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
            onOpenMathEditor={openMathEditor}
            onOpenImageModal={() => setImageModalOpen(true)}
            onUploadTex={handleUploadTex}
            onOpenGoogleDrive={() => setGoogleDriveModalOpen(true)}
            onGoHome={onGoHome}
            onCompile={compile}
            pdfCompiling={pdfCompiling}
            documentTitle={documentTitle}
            onTitleChange={handleTitleChange}
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
          onInsert={(src, alt, assetFilename) => {
            editor!.chain().focus().setImage({ src, alt, assetFilename } as any).run()
            setImageModalOpen(false)
          }}
          onRegisterAsset={registerUploadedFile}
          onClose={() => setImageModalOpen(false)}
        />
      )}
      {googleDriveModalOpen && (
        <GoogleDriveModal
          currentDocId={currentDocId}
          onDocumentImported={() => {
            listDocuments().catch(console.error)
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

function SharedPage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  if (!token) return <Navigate to="/" replace />
  return <SharedDocumentView shareToken={token} user={user} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/shared/:token" element={<SharedPage />} />
        <Route path="/document/:id" element={<RequireAuth><EditorPage /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><HomeScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
