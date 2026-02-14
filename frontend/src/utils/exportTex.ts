export function exportTex(latex: string, filename = 'documento.tex') {
  const blob = new Blob([latex], { type: 'application/x-tex' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
