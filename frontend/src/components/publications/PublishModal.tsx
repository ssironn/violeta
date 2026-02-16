import { useState } from 'react'
import { X, FileText, BookOpen, GraduationCap, Lightbulb } from 'lucide-react'
import { createPublication } from '../../api/publications'

const PUBLICATION_TYPES = [
  { value: 'article', label: 'Artigo', icon: FileText },
  { value: 'exercise_list', label: 'Lista de Exercicios', icon: BookOpen },
  { value: 'study_material', label: 'Material de Estudo', icon: GraduationCap },
  { value: 'proof', label: 'Demonstracao', icon: Lightbulb },
] as const

interface PublishModalProps {
  pdfBlob: Blob | null
  documentId?: string
  documentTitle: string
  onPublished: (publicationId: string) => void
  onClose: () => void
}

export function PublishModal({ pdfBlob, documentId, documentTitle, onPublished, onClose }: PublishModalProps) {
  const [title, setTitle] = useState(documentTitle)
  const [abstract, setAbstract] = useState('')
  const [type, setType] = useState<string>('article')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePublish() {
    if (!pdfBlob) {
      setError('Compile o documento antes de publicar.')
      return
    }
    if (!title.trim()) {
      setError('Titulo e obrigatorio.')
      return
    }
    setPublishing(true)
    setError(null)
    try {
      const pub = await createPublication(pdfBlob, {
        title: title.trim(),
        type,
        abstract: abstract.trim() || undefined,
        document_id: documentId,
      })
      onPublished(pub.id)
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative border border-surface-border rounded-2xl shadow-[0_24px_80px_rgba(88,28,135,0.3)] overflow-hidden w-full max-w-lg mx-4 v-modal-bg"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b v-modal-divider">
          <h3 className="text-[13px] font-semibold tracking-wide text-accent-200 uppercase">Publicar Documento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-accent-300/70 mb-1.5">Titulo</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              className="w-full v-modal-input rounded-lg px-3 py-2 text-sm text-accent-100 placeholder:text-accent-100/20 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 transition-all" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-accent-300/70 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {PUBLICATION_TYPES.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setType(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                    type === value ? 'bg-accent-500/20 text-accent-200 border-accent-500/30' : 'text-accent-300/40 hover:text-accent-300/70 hover:bg-white/[0.03] border-transparent'
                  }`}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-accent-300/70 mb-1.5">
              Resumo <span className="text-accent-400/30 normal-case tracking-normal">(opcional)</span>
            </label>
            <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={3} placeholder="Breve descricao do conteudo..."
              className="w-full v-modal-input rounded-lg px-3 py-2 text-sm text-accent-100 placeholder:text-accent-100/20 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 transition-all resize-none" />
          </div>

          {!pdfBlob && <p className="text-[12px] text-amber-400/80">Compile o documento primeiro para gerar o PDF.</p>}
          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end px-5 py-3.5 border-t v-modal-divider v-modal-footer gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] rounded-lg transition-colors">Cancelar</button>
          <button onClick={handlePublish} disabled={!pdfBlob || publishing || !title.trim()}
            className="px-5 py-1.5 text-[13px] font-semibold bg-accent-500 text-white rounded-lg hover:bg-accent-400 transition-colors shadow-lg shadow-accent-500/20 disabled:opacity-40 disabled:pointer-events-none">
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
