import { useState, useEffect } from 'react'
import { X, Upload, Download, Loader2, CloudOff, HardDrive } from 'lucide-react'
import { getGoogleAuthUrl, listGoogleFiles, importFromDrive, exportToDrive } from '../../api/google'

interface GoogleDriveModalProps {
  currentDocId: string | null
  onDocumentImported: () => void
  onClose: () => void
}

interface GoogleFile {
  id: string
  name: string
  modifiedTime: string
}

export function GoogleDriveModal({ currentDocId, onDocumentImported, onClose }: GoogleDriveModalProps) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [files, setFiles] = useState<GoogleFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [connectingAuth, setConnectingAuth] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    setLoading(true)
    setError(null)
    try {
      const result = await listGoogleFiles()
      setFiles(result)
      setConnected(true)
    } catch (err: any) {
      if (err.message?.includes('Failed to list files')) {
        setConnected(false)
      } else {
        setError(err.message || 'Failed to load files')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    setConnectingAuth(true)
    setError(null)
    try {
      const authUrl = await getGoogleAuthUrl()
      window.location.href = authUrl
    } catch (err: any) {
      setError(err.message || 'Failed to get auth URL')
      setConnectingAuth(false)
    }
  }

  async function handleImport(fileId: string) {
    setImportingId(fileId)
    setError(null)
    try {
      await importFromDrive(fileId)
      onDocumentImported()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to import file')
    } finally {
      setImportingId(null)
    }
  }

  async function handleExport() {
    if (!currentDocId) return
    setExporting(true)
    setError(null)
    try {
      await exportToDrive(currentDocId)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to export')
    } finally {
      setExporting(false)
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-surface-panel border border-surface-border/60 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-2xl shadow-violet-950/30 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5 text-text-primary">
            <div className="p-1.5 rounded-lg bg-violet-600/15">
              <HardDrive size={16} className="text-violet-400" />
            </div>
            <span className="font-medium text-sm">Google Drive</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-scale-in">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : connected === false ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CloudOff size={36} className="text-text-muted" />
              <p className="text-text-secondary text-sm text-center">
                Google Drive is not connected.
              </p>
              <button
                onClick={handleConnect}
                disabled={connectingAuth}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-violet-600/20"
              >
                {connectingAuth ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <HardDrive size={14} />
                )}
                Connect Google Drive
              </button>
            </div>
          ) : (
            <>
              {/* Export button */}
              {currentDocId && (
                <div className="mb-4">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-violet-600/20"
                  >
                    {exporting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Export current document to Drive
                  </button>
                </div>
              )}

              {/* File list */}
              <div className="space-y-1">
                <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] mb-2 px-1">
                  Your Google Docs
                </p>
                {files.length === 0 ? (
                  <p className="text-sm text-text-muted px-1 py-4 italic">
                    No files found.
                  </p>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">{file.name}</p>
                        <p className="text-xs text-text-muted">{formatDate(file.modifiedTime)}</p>
                      </div>
                      <button
                        onClick={() => handleImport(file.id)}
                        disabled={importingId !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {importingId === file.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        Import
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
