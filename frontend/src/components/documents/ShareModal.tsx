import { useState, useEffect } from 'react'
import { shareDocument, revokeShare } from '../../api/sharing'
import { X, Copy, Check, LinkIcon, Unlink } from 'lucide-react'

interface ShareModalProps {
  docId: string
  onClose: () => void
}

export function ShareModal({ docId, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    shareDocument(docId)
      .then((data) => {
        setShareUrl(data.share_url)
      })
      .catch((err) => {
        setError(err.message || 'Failed to generate share link')
      })
      .finally(() => setLoading(false))
  }, [docId])

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  async function handleRevoke() {
    setRevoking(true)
    setError(null)
    try {
      await revokeShare(docId)
      setShareUrl(null)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to revoke share link')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-surface-panel border border-surface-border/60 rounded-2xl shadow-2xl shadow-accent-950/30 w-full max-w-md mx-4 p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-600/15">
              <LinkIcon size={16} className="text-accent-400" />
            </div>
            <h2 className="text-base font-medium text-text-primary">Share Document</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 text-center text-text-muted text-sm">Generating share link...</div>
        ) : error && !shareUrl ? (
          <div className="py-4 text-center text-error text-sm">{error}</div>
        ) : shareUrl ? (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              Anyone with this link can view your document.
            </p>

            {/* Share URL field */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-surface-bg/80 border border-surface-border text-text-primary text-sm focus:outline-none font-mono text-xs"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium transition-all shadow-sm shadow-accent-600/20"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {error && <div className="text-error text-sm">{error}</div>}

            {/* Revoke button */}
            <div className="pt-3 border-t border-surface-border">
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-1.5 text-text-muted hover:text-red-400 text-sm transition-colors disabled:opacity-50"
              >
                <Unlink size={14} />
                {revoking ? 'Revoking...' : 'Revoke share link'}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-text-muted text-sm">Share link has been revoked.</div>
        )}
      </div>
    </div>
  )
}
