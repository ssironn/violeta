import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/core'

/**
 * Previously this hook synced manual LaTeX edits back into the TipTap editor
 * in real-time while the user was in code mode. However, this caused a bug:
 * parseLatex() is lossy — it cannot preserve rich editor attributes like
 * TikZ shapes, pgfplotConfig, etc. Since the editor isn't visible in code mode,
 * the real-time sync was destructive and unnecessary.
 *
 * Sync is now handled by handleViewModeChange in App.tsx, which:
 * - Restores the original editor snapshot if the LaTeX wasn't changed
 * - Parses the LaTeX only when the user actually modified it
 *
 * This hook is kept as a no-op for API compatibility.
 */
export function useLatexSync(
  _editor: Editor | null,
  _manualLatex: string | null,
  _editingLatex: boolean,
): void {
  // No-op — sync is handled by handleViewModeChange
}
