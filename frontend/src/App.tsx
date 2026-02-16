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
import type { DocumentConfig } from './types/documentConfig'
import { DEFAULT_DOCUMENT_CONFIG } from './types/documentConfig'
import { beautifyLatex } from './latex/beautifyLatex'
import { uploadTexFile } from './utils/uploadTex'
import { useDocumentAssets } from './hooks/useDocumentAssets'
import { AppLayout } from './components/layout/AppLayout'
import { AppShell } from './components/layout/AppShell'
import { PdfPanel } from './components/layout/PdfPanel'
import { LatexCodePanel } from './components/layout/LatexCodePanel'
import { EditorArea } from './components/editor/EditorArea'
import { Toolbar, type ViewMode } from './components/toolbar/Toolbar'
import { MathEditRouter } from './components/math-editors/MathEditRouter'
import { ImageInsertModal } from './components/editor/ImageInsertModal'
import { GoogleDriveModal } from './components/google/GoogleDriveModal'
import { getDocument, updateDocument, listDocuments } from './api/documents'
import { FeedPage } from './components/publications/FeedPage'
import { ExplorePage } from './components/publications/ExplorePage'
import { PublicationPage } from './components/publications/PublicationPage'
import { PublicPublicationPage } from './components/publications/PublicPublicationPage'
import { ProfilePage } from './components/publications/ProfilePage'
import { PublishModal } from './components/publications/PublishModal'
import { TikzShapeEditor } from './tikz/TikzShapeEditor'
import type { TikzShape } from './tikz/types'
import { PlotEditor } from './pgfplots/PlotEditor'
import type { PgfplotConfig } from './pgfplots/types'
import { createDefaultPgfplotConfig } from './pgfplots/types'

/** Requires auth — redirects to /signin if not logged in */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <h1 className="font-serif text-2xl font-medium text-text-primary tracking-wide">Violeta</h1>
          <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
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
          <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
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
  const navigate = useNavigate()
  const [mathEdit, setMathEdit] = useState<MathEditState | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [tikzEdit, setTikzEdit] = useState<{ shapes: TikzShape[]; pos: number; mode: 'insert' | 'edit' } | null>(null)
  const [plotEdit, setPlotEdit] = useState<{ config: PgfplotConfig; pos: number; mode: 'insert' | 'edit' } | null>(null)

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
  const [documentConfig, setDocumentConfig] = useState<DocumentConfig>(DEFAULT_DOCUMENT_CONFIG)
  const generatedLatex = useLatexGenerator(editor, documentConfig)

  // View mode + PDF panel visibility
  const [viewMode, setViewMode] = useState<ViewMode>('document')
  const [showPdf, setShowPdf] = useState(true)
  const [manualLatex, setManualLatex] = useState<string | null>(null)

  // Hover-to-highlight
  const [hoveredMath, setHoveredMath] = useState<string | null>(null)

  const editingLatex = viewMode === 'code'
  useLatexSync(editor, manualLatex, editingLatex)

  const effectiveLatex = viewMode === 'code' && manualLatex !== null ? manualLatex : generatedLatex

  const { pdfUrl, pdfBlob, compiling: pdfCompiling, error: pdfError, autoCompile, setAutoCompile, compile } = usePdfCompiler(effectiveLatex, getCompileAssets)

  function handleViewModeChange(mode: ViewMode) {
    if (mode === viewMode) return
    if (mode === 'code') {
      setManualLatex(beautifyLatex(generatedLatex))
    } else {
      // Switching back to document — parse manual LaTeX back into editor
      if (manualLatex !== null && editor) {
        const preamble = extractCustomPreamble(manualLatex)
        setCustomPreamble(preamble)
        updateKatexMacros(preamble)
        const doc = parseLatex(manualLatex)
        editor.commands.setContent(doc)
      }
      setManualLatex(null)
    }
    setViewMode(mode)
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
      if (viewMode === 'code') {
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

  const openTikzEditor = useCallback(() => {
    if (!editor) return
    setTikzEdit({
      shapes: [],
      pos: editor.state.selection.from,
      mode: 'insert',
    })
  }, [editor])

  const openPlotEditor = useCallback(() => {
    if (!editor) return
    setPlotEdit({
      config: createDefaultPgfplotConfig(),
      pos: editor.state.selection.from,
      mode: 'insert',
    })
  }, [editor])

  useEffect(() => {
    function handleTikzClick(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail) {
        setTikzEdit({ shapes: detail.shapes || [], pos: detail.pos, mode: 'edit' })
      }
    }
    document.addEventListener('tikz-figure-click', handleTikzClick)
    return () => document.removeEventListener('tikz-figure-click', handleTikzClick)
  }, [])

  useEffect(() => {
    function handlePlotClick(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail) {
        setPlotEdit({ config: detail.plotConfig || createDefaultPgfplotConfig(), pos: detail.pos, mode: 'edit' })
      }
    }
    document.addEventListener('pgfplot-block-click', handlePlotClick)
    return () => document.removeEventListener('pgfplot-block-click', handlePlotClick)
  }, [])

  // Load initial document
  useEffect(() => {
    if (initialDocId && editor) {
      getDocument(initialDocId)
        .then(doc => {
          setDocumentTitle(doc.title || '')
          const content = doc.content as Record<string, any>
          if (content?.type === 'latex' && typeof content.source === 'string') {
            // Restore document config if saved, otherwise use defaults
            if (content.documentConfig) {
              setDocumentConfig({ ...DEFAULT_DOCUMENT_CONFIG, ...content.documentConfig })
            }
            // Extract custom preamble/macros from the LaTeX source
            const preamble = extractCustomPreamble(content.source)
            setCustomPreamble(preamble)
            updateKatexMacros(preamble)
            if (content.editorJSON) {
              // Prefer saved editor state for perfect round-trip (preserves shapes, plotConfig, etc.)
              editor.commands.setContent(content.editorJSON)
            } else {
              // Fallback: parse LaTeX source (e.g. imported .tex files)
              const parsed = parseLatex(content.source)
              editor.commands.setContent(parsed)
            }
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
        const editorJSON = editor.getJSON()
        const latexSource = generateLatex(editorJSON, documentConfig)
        const content = { type: 'latex', source: latexSource, documentConfig, editorJSON }
        updateDocument(docId, { content }).catch(console.error)
      }, 2000)
    }
    editor.on('update', handler)
    // Also trigger save when documentConfig changes
    handler()
    return () => {
      editor.off('update', handler)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [editor, currentDocId, documentConfig])

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
          <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
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

  function handleTikzSave(tikzCode: string, shapes: TikzShape[]) {
    if (!tikzEdit || !editor) return
    if (tikzEdit.mode === 'insert') {
      editor.chain().focus().insertContent({
        type: 'tikzFigure',
        attrs: { tikzCode, shapes },
      }).run()
    } else {
      ;(editor.commands as any).updateTikzFigure({ tikzCode, shapes, pos: tikzEdit.pos })
    }
    setTikzEdit(null)
    editor.commands.focus()
  }

  function handleTikzDelete() {
    if (!tikzEdit || !editor) return
    if (tikzEdit.mode === 'edit') {
      ;(editor.commands as any).deleteTikzFigure({ pos: tikzEdit.pos })
    }
    setTikzEdit(null)
    editor.commands.focus()
  }

  function handlePlotSave(pgfCode: string, plotConfig: PgfplotConfig) {
    if (!plotEdit || !editor) return
    if (plotEdit.mode === 'insert') {
      editor.chain().focus().insertContent({
        type: 'pgfplotBlock',
        attrs: { pgfCode, plotConfig },
      }).run()
    } else {
      ;(editor.commands as any).updatePgfplot({ pgfCode, plotConfig, pos: plotEdit.pos })
    }
    setPlotEdit(null)
    editor.commands.focus()
  }

  function handlePlotDelete() {
    if (!plotEdit || !editor) return
    if (plotEdit.mode === 'edit') {
      ;(editor.commands as any).deletePgfplot({ pos: plotEdit.pos })
    }
    setPlotEdit(null)
    editor.commands.focus()
  }

  return (
    <>
      <AppLayout
        showRightPanel={showPdf}
        toolbar={
          <Toolbar
            editor={editor}
            latex={effectiveLatex}
            pdfBlob={pdfBlob}
            onOpenMathEditor={openMathEditor}
            onOpenImageModal={() => setImageModalOpen(true)}
            onOpenTikzEditor={openTikzEditor}
            onOpenPlotEditor={openPlotEditor}
            onUploadTex={handleUploadTex}
            onOpenGoogleDrive={() => setGoogleDriveModalOpen(true)}
            onGoHome={onGoHome}
            onCompile={compile}
            pdfCompiling={pdfCompiling}
            documentTitle={documentTitle}
            onTitleChange={handleTitleChange}
            onPublish={() => setPublishModalOpen(true)}
            documentConfig={documentConfig}
            onDocumentConfigChange={setDocumentConfig}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            showPdf={showPdf}
            onTogglePdf={() => setShowPdf(v => !v)}
          />
        }
        editor={
          viewMode === 'document'
            ? <EditorArea editor={editor} onOpenMathEditor={openMathEditor} onOpenImageModal={() => setImageModalOpen(true)} onOpenTikzEditor={openTikzEditor} onOpenPlotEditor={openPlotEditor} onHoverMath={setHoveredMath} />
            : <LatexCodePanel latex={effectiveLatex} onLatexChange={handleLatexChange} />
        }
        rightPanel={
          <PdfPanel
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
      {tikzEdit && (
        <TikzShapeEditor
          initialShapes={tikzEdit.shapes}
          onSave={handleTikzSave}
          onDelete={handleTikzDelete}
          onClose={() => setTikzEdit(null)}
          isInsert={tikzEdit.mode === 'insert'}
        />
      )}
      {plotEdit && (
        <PlotEditor
          initialConfig={plotEdit.config}
          onSave={handlePlotSave}
          onDelete={handlePlotDelete}
          onClose={() => setPlotEdit(null)}
          isInsert={plotEdit.mode === 'insert'}
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
      {publishModalOpen && (
        <PublishModal
          pdfBlob={pdfBlob}
          documentId={currentDocId ?? undefined}
          documentTitle={documentTitle}
          onPublished={(pubId) => {
            setPublishModalOpen(false)
            navigate(`/publication/${pubId}`)
          }}
          onClose={() => setPublishModalOpen(false)}
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
        <Route path="/p/:token" element={<PublicPublicationPage />} />
        <Route path="/document/:id" element={<RequireAuth><EditorPage /></RequireAuth>} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/publication/:id" element={<PublicationPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/" element={<HomeScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
