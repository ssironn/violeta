export function beautifyLatex(latex: string): string {
  const lines = latex.split('\n')
  const result: string[] = []
  let indent = 0
  let inVerbatim = false
  let inMathBlock = false
  let prevLineWasBlank = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()

    // Inside verbatim — pass through unchanged
    if (inVerbatim) {
      result.push(raw)
      if (trimmed === '\\end{verbatim}') {
        inVerbatim = false
        indent = Math.max(0, indent - 1)
      }
      continue
    }

    // Inside \[...\] math block — pass through with current indent
    if (inMathBlock) {
      if (trimmed === '\\]') {
        inMathBlock = false
        result.push('  '.repeat(indent) + trimmed)
      } else {
        result.push('  '.repeat(indent + 1) + trimmed)
      }
      continue
    }

    // Empty lines
    if (!trimmed) {
      // Avoid consecutive blank lines
      if (!prevLineWasBlank) {
        result.push('')
        prevLineWasBlank = true
      }
      continue
    }

    prevLineWasBlank = false

    // Check for \begin{verbatim}
    if (trimmed === '\\begin{verbatim}') {
      inVerbatim = true
      result.push('  '.repeat(indent) + trimmed)
      indent++
      continue
    }

    // Check for \[ math block start
    if (trimmed === '\\[') {
      inMathBlock = true
      result.push('  '.repeat(indent) + trimmed)
      continue
    }

    // Spacing before headings
    if (/^\\section\{/.test(trimmed) && result.length > 0) {
      // 2 blank lines before \section
      if (!prevLineWasBlank) result.push('')
      result.push('')
      prevLineWasBlank = false
    } else if (/^\\(subsection|subsubsection)\{/.test(trimmed) && result.length > 0) {
      // 1 blank line before \subsection
      if (!prevLineWasBlank) result.push('')
      prevLineWasBlank = false
    }

    // Decrease indent before \end{...}
    const endEnvMatch = trimmed.match(/^\\end\{(\w+)\}/)
    if (endEnvMatch) {
      indent = Math.max(0, indent - 1)
    }

    // Format the line
    const formatted = '  '.repeat(indent) + trimmed

    // Spacing before \begin{...}
    const beginEnvMatch = trimmed.match(/^\\begin\{(\w+)\}/)
    if (beginEnvMatch && beginEnvMatch[1] !== 'document') {
      if (result.length > 0 && result[result.length - 1]?.trim() !== '') {
        result.push('')
      }
    }

    result.push(formatted)

    // Increase indent after \begin{...}
    if (beginEnvMatch) {
      indent++
    }

    // Spacing after \end{...}
    if (endEnvMatch && endEnvMatch[1] !== 'document') {
      // Blank line after environment (unless next line is also \end)
      const nextTrimmed = i + 1 < lines.length ? lines[i + 1]?.trim() : ''
      if (nextTrimmed && !nextTrimmed.startsWith('\\end{')) {
        result.push('')
        prevLineWasBlank = true
      }
    }
  }

  // Clean up: remove trailing whitespace and excess blank lines at start/end
  return result
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n+$/, '\n')
}
