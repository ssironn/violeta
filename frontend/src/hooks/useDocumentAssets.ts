import { useCallback, useRef, useState } from 'react'

export interface AssetEntry {
  filename: string
  mimeType: string
  dataUrl: string
  origin: 'upload' | 'import'
}

export interface CompileAsset {
  filename: string
  dataUrl: string
}

/**
 * Convert a data URL to a Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

/**
 * Convert an ArrayBuffer to a data URL.
 */
export function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}

/**
 * Guess MIME type from file extension.
 */
export function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    eps: 'application/postscript',
    bib: 'text/plain',
    sty: 'text/plain',
    cls: 'text/plain',
    bst: 'text/plain',
  }
  return map[ext] ?? 'application/octet-stream'
}

/**
 * Hook that manages document assets (images, .bib, etc.) for compilation.
 */
export function useDocumentAssets() {
  const assetsRef = useRef<Map<string, AssetEntry>>(new Map())
  // version counter to trigger re-renders when assets change
  const [, setVersion] = useState(0)

  const bump = () => setVersion((v) => v + 1)

  const registerAsset = useCallback((entry: AssetEntry) => {
    assetsRef.current.set(entry.filename, entry)
    bump()
  }, [])

  const removeAsset = useCallback((filename: string) => {
    assetsRef.current.delete(filename)
    bump()
  }, [])

  const clearAssets = useCallback(() => {
    assetsRef.current.clear()
    bump()
  }, [])

  const getCompileAssets = useCallback((): CompileAsset[] => {
    return Array.from(assetsRef.current.values()).map((a) => ({
      filename: a.filename,
      dataUrl: a.dataUrl,
    }))
  }, [])

  const hasAsset = useCallback((filename: string): boolean => {
    return assetsRef.current.has(filename)
  }, [])

  /**
   * Register an uploaded file. Returns the filename to use in the editor.
   */
  const registerUploadedFile = useCallback((file: File, dataUrl: string): string => {
    const filename = file.name
    assetsRef.current.set(filename, {
      filename,
      mimeType: file.type || mimeFromFilename(filename),
      dataUrl,
      origin: 'upload',
    })
    bump()
    return filename
  }, [])

  return {
    registerAsset,
    registerUploadedFile,
    removeAsset,
    clearAssets,
    getCompileAssets,
    hasAsset,
    assetCount: assetsRef.current.size,
  }
}
