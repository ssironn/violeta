import JSZip from 'jszip'
import { type AssetEntry, mimeFromFilename, arrayBufferToDataUrl } from '../hooks/useDocumentAssets'

export interface UploadTexResult {
  tex: string
  assets: AssetEntry[]
}

const TEX_EXTENSIONS = new Set(['tex', 'latex'])
const SKIP_EXTENSIONS = new Set(['aux', 'log', 'out', 'toc', 'synctex', 'fls', 'fdb_latexmk'])

function isTexFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return TEX_EXTENSIONS.has(ext)
}

function shouldSkip(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return SKIP_EXTENSIONS.has(ext) || name.startsWith('__MACOSX') || name.startsWith('.')
}

async function handleZip(file: File): Promise<UploadTexResult> {
  const zip = await JSZip.loadAsync(file)
  const entries = Object.values(zip.files).filter((f) => !f.dir && !shouldSkip(f.name))

  // Find .tex files
  const texFiles = entries.filter((f) => isTexFile(f.name))

  if (texFiles.length === 0) {
    throw new Error('Nenhum arquivo .tex encontrado no ZIP.')
  }
  if (texFiles.length > 1) {
    const names = texFiles.map((f) => f.name).join(', ')
    throw new Error(
      `Múltiplos arquivos .tex encontrados no ZIP (${names}). O ZIP deve conter apenas um arquivo .tex.`
    )
  }

  const texEntry = texFiles[0]
  const tex = await texEntry.async('string')

  // Strip common path prefix so filenames match \includegraphics references
  const texDir = texEntry.name.includes('/') ? texEntry.name.slice(0, texEntry.name.lastIndexOf('/') + 1) : ''

  // Extract all other files as assets
  const assets: AssetEntry[] = []
  for (const entry of entries) {
    if (entry === texEntry) continue
    const buffer = await entry.async('arraybuffer')
    // Remove the common tex directory prefix to get relative path
    const relativeName = texDir && entry.name.startsWith(texDir)
      ? entry.name.slice(texDir.length)
      : entry.name
    const mimeType = mimeFromFilename(relativeName)
    const dataUrl = arrayBufferToDataUrl(buffer, mimeType)
    assets.push({ filename: relativeName, mimeType, dataUrl, origin: 'import' })
  }

  return { tex, assets }
}

function handleTexFile(file: File): Promise<UploadTexResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({ tex: reader.result, assets: [] })
      } else {
        reject(new Error('Falha ao ler arquivo .tex'))
      }
    }
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsText(file)
  })
}

export function uploadTexFile(onLoaded: (result: UploadTexResult) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.tex,.latex,.zip,text/plain,application/zip'
  input.style.display = 'none'

  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return

    try {
      const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip'
      const result = isZip ? await handleZip(file) : await handleTexFile(file)
      onLoaded(result)
    } catch (err: any) {
      alert(err.message || 'Erro ao processar arquivo')
    }
  })

  document.body.appendChild(input)
  input.click()
  document.body.removeChild(input)
}
