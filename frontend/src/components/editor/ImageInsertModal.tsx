import { useState, useRef, useCallback } from 'react'
import { X, Link, Upload } from 'lucide-react'

type Mode = 'url' | 'upload'

interface ImageInsertModalProps {
  onInsert: (src: string, alt: string) => void
  onClose: () => void
}

export function ImageInsertModal({ onInsert, onClose }: ImageInsertModalProps) {
  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const src = mode === 'url' ? url.trim() : fileData
  const canInsert = !!src

  function handleInsert() {
    if (!src) return
    onInsert(src, alt.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && canInsert && e.target instanceof HTMLInputElement) {
      e.preventDefault()
      handleInsert()
    }
  }

  const readFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setFileData(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setMode('upload')
      readFile(file)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  const previewSrc = mode === 'url' ? url.trim() : fileData

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative border border-surface-border rounded-2xl shadow-[0_24px_80px_rgba(88,28,135,0.3)] overflow-hidden w-full max-w-lg mx-4"
        style={{
          background: 'linear-gradient(170deg, #2a1842 0%, #1a1028 40%, #150d22 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-semibold tracking-wide text-violet-200 uppercase">
            Inserir Imagem
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-2">
          <TabButton
            active={mode === 'url'}
            icon={<Link size={14} />}
            label="URL"
            onClick={() => setMode('url')}
          />
          <TabButton
            active={mode === 'upload'}
            icon={<Upload size={14} />}
            label="Upload"
            onClick={() => setMode('upload')}
          />
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* URL input */}
          {mode === 'url' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">
                URL da imagem
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.png"
                autoFocus
                className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-violet-100 placeholder:text-violet-100/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
          )}

          {/* File upload */}
          {mode === 'upload' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">
                Arquivo
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-all ${
                  dragging
                    ? 'border-violet-400 bg-violet-500/10'
                    : 'border-white/[0.1] hover:border-violet-500/30 hover:bg-white/[0.02]'
                }`}
              >
                <Upload size={20} className="text-violet-400/50" />
                {fileName ? (
                  <span className="text-sm text-violet-200 truncate max-w-full">{fileName}</span>
                ) : (
                  <span className="text-sm text-violet-300/40">
                    Arraste uma imagem ou clique para selecionar
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Alt text */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">
              Texto alternativo
              <span className="text-violet-400/30 ml-1 normal-case tracking-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Descrição da imagem"
              className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-violet-100 placeholder:text-violet-100/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
          </div>

          {/* Preview */}
          {previewSrc && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">
                Pré-visualização
              </label>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 flex items-center justify-center min-h-[80px] max-h-[200px] overflow-hidden">
                <img
                  src={previewSrc}
                  alt={alt || 'preview'}
                  className="max-w-full max-h-[180px] object-contain rounded"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                  onLoad={(e) => {
                    ;(e.target as HTMLImageElement).style.display = ''
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-white/[0.06] bg-black/10 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleInsert}
            disabled={!canInsert}
            className="px-5 py-1.5 text-[13px] font-semibold bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:pointer-events-none"
          >
            Inserir
          </button>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
        active
          ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
          : 'text-violet-300/40 hover:text-violet-300/70 hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
