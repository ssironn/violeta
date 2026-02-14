import { useState, useEffect } from 'react'
import { getSharedDocument, copySharedDocument } from '../../api/sharing'
import type { User } from '../../api/auth'
import { FileText, Copy, ArrowLeft } from 'lucide-react'

interface SharedDocumentViewProps {
  shareToken: string
  user: User | null
}

interface SharedDoc {
  id: string
  title: string
  owner_name: string
  created_at: string
  updated_at: string
}

export function SharedDocumentView({ shareToken, user }: SharedDocumentViewProps) {
  const [doc, setDoc] = useState<SharedDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSharedDocument(shareToken)
      .then(setDoc)
      .catch(() => setError('Document not found or link has expired.'))
      .finally(() => setLoading(false))
  }, [shareToken])

  async function handleCopy() {
    if (!user) {
      window.location.href = '/'
      return
    }
    setCopying(true)
    try {
      await copySharedDocument(shareToken)
      setCopySuccess(true)
    } catch {
      setError('Failed to copy document.')
    } finally {
      setCopying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="text-text-muted text-sm">Loading shared document...</div>
      </div>
    )
  }

  if (error && !doc) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="text-center space-y-4">
          <div className="text-error text-sm">{error}</div>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-accent hover:text-violet-400 text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Violeta
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-bg">
      <div className="w-full max-w-lg mx-4">
        <div className="bg-surface-panel border border-surface-border rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-surface-elevated">
              <FileText size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">
                {doc?.title || 'Untitled'}
              </h1>
              <p className="text-text-muted text-sm">
                Shared by {doc?.owner_name || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-surface-elevated rounded-lg border border-surface-border p-4 mb-6">
            <p className="text-text-secondary text-sm">
              This is a shared document. You can make a copy to edit it in your own workspace.
            </p>
            {doc?.updated_at && (
              <p className="text-text-muted text-xs mt-2">
                Last updated: {new Date(doc.updated_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {error && <div className="text-error text-sm mb-4">{error}</div>}

          {/* Actions */}
          {copySuccess ? (
            <div className="text-center space-y-4">
              <div className="text-green-400 text-sm font-medium">
                Document copied successfully!
              </div>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-violet-400 text-white text-sm font-medium transition-colors"
              >
                Open in Violeta
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {user ? (
                <button
                  onClick={handleCopy}
                  disabled={copying}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-violet-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Copy size={16} />
                  {copying ? 'Copying...' : 'Make a copy'}
                </button>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-text-secondary text-sm">
                    Sign in to make a copy of this document.
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-accent hover:bg-violet-400 text-white text-sm font-medium transition-colors"
                  >
                    Sign in
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Back link */}
          <div className="mt-6 pt-4 border-t border-surface-border text-center">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Violeta
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
