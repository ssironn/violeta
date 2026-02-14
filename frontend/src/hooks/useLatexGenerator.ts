import { useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { generateLatex } from '../latex/generateLatex'

export function useLatexGenerator(editor: Editor | null, customPreamble?: string) {
  const [latex, setLatex] = useState('')

  const update = useCallback(() => {
    if (!editor) return
    const json = editor.getJSON()
    setLatex(generateLatex(json, customPreamble))
  }, [editor, customPreamble])

  useEffect(() => {
    if (!editor) return

    update()

    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor, update])

  return latex
}
