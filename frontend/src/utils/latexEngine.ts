/**
 * LaTeX compilation via texlive.net public API.
 * In development, requests go through Vite's proxy (/texlive-api)
 * to avoid CORS issues.
 */

import { type CompileAsset, dataUrlToBlob } from '../hooks/useDocumentAssets'

const TEXLIVE_ENDPOINT = '/texlive-api/cgi-bin/latexcgi'

/**
 * Compile a LaTeX source string via texlive.net and return a PDF Blob.
 * Optionally include asset files (images, .bib, etc.) that the LaTeX references.
 */
export async function compileLatexSource(
  latexSource: string,
  assets: CompileAsset[] = [],
): Promise<{ pdf: Blob; log: string }> {
  const formData = new FormData()

  // Main .tex file
  formData.append('filecontents[]', latexSource)
  formData.append('filename[]', 'document.tex')

  // Asset files (images, .bib, etc.)
  for (const asset of assets) {
    const blob = dataUrlToBlob(asset.dataUrl)
    formData.append('filecontents[]', blob, asset.filename)
    formData.append('filename[]', asset.filename)
  }

  formData.append('engine', 'pdflatex')
  formData.append('return', 'pdf')

  const response = await fetch(TEXLIVE_ENDPOINT, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    // Try to read error info from body
    const text = await response.text().catch(() => '')
    throw new Error(extractErrorFromLog(text) || `Erro do servidor: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/pdf')) {
    const blob = await response.blob()
    return { pdf: blob, log: '' }
  }

  // Got text back — either a log file or error
  const text = await response.text()

  if (response.url?.endsWith('.pdf')) {
    // The content-type might be wrong but the URL says PDF
    const blob = new Blob([text], { type: 'application/pdf' })
    return { pdf: blob, log: '' }
  }

  throw new Error(extractErrorFromLog(text))
}

function extractErrorFromLog(log: string): string {
  if (!log) return 'Compilação falhou'
  const lines = log.split('\n')
  const errorLines = lines.filter(l => l.startsWith('!') || l.includes('Error'))
  if (errorLines.length > 0) {
    return errorLines.slice(0, 3).join('\n')
  }
  return log.slice(0, 300) || 'Compilação falhou'
}
