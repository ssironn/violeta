import { type CompileAsset, dataUrlToBlob } from '../hooks/useDocumentAssets'

const COMPILE_ENDPOINT = '/api/compile'

/**
 * Compile a LaTeX source string via the backend Tectonic endpoint and return a PDF Blob.
 * Optionally include asset files (images, .bib, etc.) that the LaTeX references.
 */
export async function compileLatexSource(
  latexSource: string,
  assets: CompileAsset[] = [],
): Promise<{ pdf: Blob; log: string }> {
  const formData = new FormData()

  // Main .tex file
  const texBlob = new Blob([latexSource], { type: 'application/x-tex' })
  formData.append('file', texBlob, 'document.tex')

  // Asset files (images, .bib, etc.)
  for (const asset of assets) {
    const blob = dataUrlToBlob(asset.dataUrl)
    formData.append('assets', blob, asset.filename)
  }

  const response = await fetch(COMPILE_ENDPOINT, {
    method: 'POST',
    body: formData,
  })

  const contentType = response.headers.get('content-type') ?? ''

  if (response.ok && contentType.includes('application/pdf')) {
    const blob = await response.blob()
    return { pdf: blob, log: '' }
  }

  if (response.status === 422) {
    const data = await response.json()
    throw new Error(data.error || 'Compilação falhou')
  }

  throw new Error(`Erro do servidor: ${response.status}`)
}
