import { describe, it, expect } from 'vitest'
import { parseLatex } from '../parseLatex'

describe('parseLatex — heading commands imported as headings', () => {
  it('parses \\section{Title} as heading level 1', () => {
    const doc = parseLatex('\\section{Hello}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(1)
    expect(heading.content![0].text).toBe('Hello')
  })

  it('parses \\subsection{Title} as heading level 2', () => {
    const doc = parseLatex('\\subsection{Sub}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(2)
  })

  it('parses \\chapter{Title} as heading level 0', () => {
    const doc = parseLatex('\\chapter{Introduction}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.content![0].text).toBe('Introduction')
  })

  it('parses \\section*{Title} with starred attribute', () => {
    const doc = parseLatex('\\section*{Unnumbered}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(1)
    expect(heading.attrs?.starred).toBe(true)
    expect(heading.content![0].text).toBe('Unnumbered')
  })

  it('parses font-size heading {\\LARGE \\textbf{...}} as level 1', () => {
    const doc = parseLatex('{\\LARGE \\textbf{My Title}}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(1)
    expect(heading.content![0].text).toBe('My Title')
  })

  it('parses font-size heading {\\Large \\textbf{...}} as level 2', () => {
    const doc = parseLatex('{\\Large \\textbf{Subtitle}}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(2)
  })
})

describe('parseLatex — CONTENT_DISPLAY_COMMANDS', () => {
  it('extracts \\title{X} content as paragraph with sourceCommand mark', () => {
    const doc = parseLatex('\\title{My Document}')
    const para = doc.content![0]
    expect(para.type).toBe('paragraph')
    const textNode = para.content![0]
    expect(textNode.text).toBe('My Document')
    const srcMark = textNode.marks?.find((m: any) => m.type === 'sourceCommand')
    expect(srcMark).toBeDefined()
    expect(srcMark!.attrs!.command).toBe('title')
  })

  it('extracts \\author{X} content with sourceCommand mark', () => {
    const doc = parseLatex('\\author{John Doe}')
    const para = doc.content![0]
    const textNode = para.content![0]
    expect(textNode.text).toBe('John Doe')
    const srcMark = textNode.marks?.find((m: any) => m.type === 'sourceCommand')
    expect(srcMark!.attrs!.command).toBe('author')
  })

  it('extracts \\textsc{X} content with sourceCommand mark', () => {
    const doc = parseLatex('Hello \\textsc{Small Caps} world')
    const para = doc.content![0]
    const scNode = para.content!.find((n: any) =>
      n.marks?.some((m: any) => m.type === 'sourceCommand')
    )
    expect(scNode).toBeDefined()
    expect(scNode!.text).toBe('Small Caps')
  })
})

describe('parseLatex — section with optional argument', () => {
  it('parses \\section[short]{Full Title} as heading', () => {
    const doc = parseLatex('\\section[Short]{Full Title}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(1)
    expect(heading.content![0].text).toBe('Full Title')
  })

  it('parses \\subsection[short]{Full} as heading level 2', () => {
    const doc = parseLatex('\\subsection[Short]{Full Subsection}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(2)
  })
})

describe('parseLatex — multiline headings', () => {
  it('parses a section title spanning two lines', () => {
    const doc = parseLatex('\\section{A Very Long\n  Section Title}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(1)
    const text = heading.content!.map((n: any) => n.text).join('')
    expect(text).toContain('A Very Long')
    expect(text).toContain('Section Title')
  })

  it('parses chapter title spanning multiple lines', () => {
    const doc = parseLatex('\\chapter{Line One\nLine Two\nLine Three}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
  })
})

describe('parseLatex — inline math edge cases', () => {
  it('does not close inline math on escaped \\$', () => {
    const doc = parseLatex('$x = \\$5$ rest')
    const para = doc.content![0]
    const mathNode = para.content!.find((n: any) => n.type === 'inlineMath')
    expect(mathNode).toBeDefined()
    expect(mathNode!.attrs!.latex).toBe('x = \\$5')
  })

  it('handles multiple escaped dollars in math', () => {
    const doc = parseLatex('$\\$a + \\$b$')
    const para = doc.content![0]
    const mathNode = para.content!.find((n: any) => n.type === 'inlineMath')
    expect(mathNode).toBeDefined()
    expect(mathNode!.attrs!.latex).toBe('\\$a + \\$b')
  })
})

describe('parseLatex — brace matching edge cases', () => {
  it('closes brace group after \\\\\\\\ (double backslash line break)', () => {
    // Raw LaTeX: \textbf{line one \\ line two}
    // In JS: need 4 backslashes to represent \\
    const doc = parseLatex('\\textbf{line one \\\\\\\\ line two}')
    const para = doc.content![0]
    expect(para.type).toBe('paragraph')
    // The bold should contain both lines
    const boldNodes = para.content!.filter(
      (n: any) => n.type === 'text' && n.marks?.some((m: any) => m.type === 'bold')
    )
    expect(boldNodes.length).toBeGreaterThan(0)
  })

  it('handles \\textbf{x\\\\\\\\} without eating following content', () => {
    // Raw LaTeX: \textbf{x\\} next
    // The } after \\ should close the group, not be "escaped"
    const doc = parseLatex('\\textbf{x\\\\\\\\} next')
    const para = doc.content![0]
    const textNodes = para.content!.filter((n: any) => n.type === 'text')
    const allText = textNodes.map((n: any) => n.text).join('')
    expect(allText).toContain('next')
    // "next" must NOT be bold — it's outside the braces
    const nextNode = textNodes.find((n: any) => n.text?.includes('next'))
    expect(nextNode).toBeDefined()
    const hasBold = nextNode!.marks?.some((m: any) => m.type === 'bold')
    expect(hasBold).toBeFalsy()
  })
})

describe('parseLatex — callout isolation', () => {
  it('does not leak extraCalloutNames between calls', () => {
    // First call with extra callout name passed explicitly
    const doc1 = parseLatex('\\begin{axiom}\nContent\n\\end{axiom}', new Set(['axiom']))
    expect(doc1.content![0].type).toBe('calloutBlock')

    // Second call without extra — should NOT recognize axiom
    const doc2 = parseLatex('\\begin{axiom}\nContent\n\\end{axiom}')
    expect(doc2.content![0].type).toBe('rawLatex')
  })

  it('does not leak preamble-defined theorems between calls', () => {
    // First call with \newtheorem in preamble
    const latex1 = `\\newtheorem{axiom}{Axioma}
\\begin{document}
\\begin{axiom}
Content
\\end{axiom}
\\end{document}`
    const doc1 = parseLatex(latex1)
    expect(doc1.content![0].type).toBe('calloutBlock')

    // Second call WITHOUT the preamble definition
    const latex2 = `\\begin{document}
\\begin{axiom}
Content
\\end{axiom}
\\end{document}`
    const doc2 = parseLatex(latex2)
    expect(doc2.content![0].type).toBe('rawLatex')
  })
})

describe('parseLatex — description lists', () => {
  it('extracts \\item[label] in description environment', () => {
    const latex = `\\begin{description}
\\item[Alpha] First item
\\item[Beta] Second item
\\end{description}`
    const doc = parseLatex(latex)
    const list = doc.content![0]
    expect(list.type).toBe('bulletList')
    expect(list.attrs?.environment).toBe('description')
    const firstItem = list.content![0]
    expect(firstItem.attrs?.label).toBe('Alpha')
  })
})

describe('parseLatex — table parsing', () => {
  it('does not split & inside inline math in table cells', () => {
    const latex = `\\begin{table}[h]
\\begin{tabular}{|c|c|}
  Header 1 & Header 2 \\\\
  $a & b$ & normal \\\\
\\end{tabular}
\\end{table}`
    const doc = parseLatex(latex)
    const table = doc.content!.find((n: any) => n.type === 'latexTable')
    expect(table).toBeDefined()
    const rows = table!.attrs!.rows as string[][]
    expect(rows[0][0]).toBe('$a & b$')
    expect(rows[0][1]).toBe('normal')
  })

  it('handles multiple math cells in a row', () => {
    const latex = `\\begin{tabular}{cc}
  $x$ & $y$ \\\\
  $a & b$ & $c$ \\\\
\\end{tabular}`
    const doc = parseLatex(latex)
    const table = doc.content!.find((n: any) => n.type === 'latexTable')
    expect(table).toBeDefined()
    const rows = table!.attrs!.rows as string[][]
    expect(rows[0][0]).toBe('$a & b$')
  })
})

describe('parseLatex — textcolor', () => {
  it('parses \\textcolor{red}{text} into textStyle mark with color', () => {
    const doc = parseLatex('Hello \\textcolor{red}{world}')
    const para = doc.content![0]
    const colorNode = para.content!.find(
      (n: any) => n.marks?.some((m: any) => m.type === 'textStyle')
    )
    expect(colorNode).toBeDefined()
    expect(colorNode!.text).toBe('world')
    const mark = colorNode!.marks!.find((m: any) => m.type === 'textStyle')
    expect(mark!.attrs!.color).toBe('red')
  })

  it('parses \\textcolor with nested bold', () => {
    const doc = parseLatex('\\textcolor{blue}{\\textbf{bold}}')
    const para = doc.content![0]
    const node = para.content![0]
    expect(node.marks).toHaveLength(2)
    expect(node.marks!.some((m: any) => m.type === 'textStyle' && m.attrs?.color === 'blue')).toBe(true)
    expect(node.marks!.some((m: any) => m.type === 'bold')).toBe(true)
  })
})

describe('parseLatex — url command', () => {
  it('parses \\url{https://example.com} as a link', () => {
    const doc = parseLatex('Visit \\url{https://example.com}')
    const para = doc.content![0]
    const linkNode = para.content!.find(
      (n: any) => n.marks?.some((m: any) => m.type === 'link')
    )
    expect(linkNode).toBeDefined()
    expect(linkNode!.text).toBe('https://example.com')
    const linkMark = linkNode!.marks!.find((m: any) => m.type === 'link')
    expect(linkMark!.attrs!.href).toBe('https://example.com')
  })
})

describe('parseLatex — footnotes', () => {
  it('parses \\footnote{text} as footnote inline node', () => {
    const doc = parseLatex('Hello\\footnote{A note} world')
    const para = doc.content![0]
    const fn = para.content!.find((n: any) => n.type === 'footnote')
    expect(fn).toBeDefined()
    expect(fn!.attrs!.content).toBe('A note')
  })
})

describe('parseLatex — comment stripping edge cases', () => {
  it('preserves % inside verbatim environment', () => {
    const latex = `\\begin{verbatim}
code with 50% complete
\\end{verbatim}`
    const doc = parseLatex(latex)
    const code = doc.content![0]
    expect(code.type).toBe('codeBlock')
    const text = code.content![0].text
    expect(text).toContain('50% complete')
  })

  it('preserves % inside lstlisting environment', () => {
    const latex = `\\begin{lstlisting}
printf("%d\\n", x);
\\end{lstlisting}`
    const doc = parseLatex(latex)
    const code = doc.content![0]
    expect(code.type).toBe('codeBlock')
    const text = code.content![0].text
    expect(text).toContain('%d')
  })
})
