export function uploadTexFile(onLoaded: (content: string) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.tex,.latex,text/plain'
  input.style.display = 'none'

  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      if (typeof text === 'string') {
        onLoaded(text)
      }
    }
    reader.readAsText(file)
  })

  document.body.appendChild(input)
  input.click()
  document.body.removeChild(input)
}
