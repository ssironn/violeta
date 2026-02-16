import { useEffect, useState, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { generateLatex } from '../latex/generateLatex'
import type { DocumentConfig } from '../types/documentConfig'

export function useLatexGenerator(editor: Editor | null, configOrPreamble?: DocumentConfig | string) {
  const [latex, setLatex] = useState('')
  const configRef = useRef(configOrPreamble)
  configRef.current = configOrPreamble

  // Serialize to detect actual value changes
  const configKey = typeof configOrPreamble === 'string'
    ? configOrPreamble
    : JSON.stringify(configOrPreamble)

  const update = useCallback(() => {
    if (!editor) return
    const json = editor.getJSON()
    setLatex(generateLatex(json, configRef.current))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, configKey])

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
