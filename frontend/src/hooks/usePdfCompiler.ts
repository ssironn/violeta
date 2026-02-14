import { useEffect, useRef, useState, useCallback } from 'react'
import { compileLatexSource } from '../utils/latexEngine'

interface PdfCompilerState {
  pdfUrl: string | null
  pdfBlob: Blob | null
  compiling: boolean
  error: string | null
  autoCompile: boolean
  setAutoCompile: (v: boolean) => void
  compile: () => void
}

/**
 * LaTeX compilation via texlive.net API.
 * Manual compile by default; optional autocompile with debounce.
 */
export function usePdfCompiler(
  latex: string,
  debounceMs = 4000,
): PdfCompilerState {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [compiling, setCompiling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoCompile, setAutoCompile] = useState(false)
  const prevUrlRef = useRef<string | null>(null)
  const versionRef = useRef(0)
  const latexRef = useRef(latex)
  latexRef.current = latex

  const doCompile = useCallback(async (source: string) => {
    const version = ++versionRef.current
    setCompiling(true)
    setError(null)

    try {
      const { pdf } = await compileLatexSource(source)

      if (version !== versionRef.current) return

      const url = URL.createObjectURL(pdf)
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
      prevUrlRef.current = url

      setPdfUrl(url)
      setPdfBlob(pdf)
      setError(null)
    } catch (err: any) {
      if (version !== versionRef.current) return
      setError(err.message || 'Erro ao compilar LaTeX')
    } finally {
      if (version === versionRef.current) setCompiling(false)
    }
  }, [])

  const compile = useCallback(() => {
    if (!latexRef.current.trim()) return
    doCompile(latexRef.current)
  }, [doCompile])

  // Autocompile with debounce
  useEffect(() => {
    if (!autoCompile || !latex.trim()) return

    const timer = setTimeout(() => {
      doCompile(latex)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [latex, autoCompile, debounceMs, doCompile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    }
  }, [])

  return { pdfUrl, pdfBlob, compiling, error, autoCompile, setAutoCompile, compile }
}
