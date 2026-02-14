import { compileLatexSource } from './latexEngine'

export function downloadPdfBlob(blob: Blob, filename = 'documento.pdf'): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function compileAndDownload(
  latexSource: string,
  onStatus?: (msg: string) => void,
): Promise<void> {
  onStatus?.('Compilando LaTeX...')

  try {
    const { pdf } = await compileLatexSource(latexSource)
    onStatus?.('')
    downloadPdfBlob(pdf)
  } catch (err: any) {
    onStatus?.('')
    throw new Error(err.message || 'Erro ao compilar LaTeX')
  }
}
