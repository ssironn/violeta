import { useRef, useEffect } from 'react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'

export function useKatexPreview(latex: string) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (!latex.trim()) {
      ref.current.textContent = ''
      return
    }
    try {
      katex.render(latex, ref.current, {
        throwOnError: false,
        displayMode: true,
        macros: { ...katexMacros },
        errorColor: '#7a6299',
      })
    } catch {
      ref.current.textContent = latex
    }
  }, [latex])

  return ref
}
