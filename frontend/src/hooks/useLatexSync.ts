import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { parseLatex } from '../latex/parseLatex'

export function useLatexSync(
  editor: Editor | null,
  manualLatex: string | null,
  editingLatex: boolean,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAppliedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!editor || !editingLatex || manualLatex === null) return
    if (manualLatex === lastAppliedRef.current) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      try {
        const doc = parseLatex(manualLatex)
        editor.commands.setContent(doc)
        lastAppliedRef.current = manualLatex
      } catch (err) {
        console.error('[useLatexSync] Failed to parse LaTeX:', err)
      }
    }, 1500)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [editor, manualLatex, editingLatex])

  // Reset lastApplied when leaving edit mode
  useEffect(() => {
    if (!editingLatex) {
      lastAppliedRef.current = null
    }
  }, [editingLatex])
}
