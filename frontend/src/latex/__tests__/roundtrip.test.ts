import { describe, it, expect } from 'vitest'
import { parseLatex } from '../parseLatex'
import { generateLatex } from '../generateLatex'

describe('round-trip: parse → generate', () => {
  it('round-trips \\chapter{Title}', () => {
    const input = '\\chapter{Introduction}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\chapter{Introduction}')
  })

  it('round-trips \\part*{Title}', () => {
    const input = '\\part*{Appendix}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\part*{Appendix}')
  })

  it('round-trips \\title{X}', () => {
    const input = '\\title{My Doc}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\title{My Doc}')
  })

  it('round-trips description list with item labels', () => {
    const input = `\\begin{description}
\\item[Alpha] First item
\\item[Beta] Second item
\\end{description}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\item[Alpha]')
    expect(output).toContain('\\item[Beta]')
  })

  it('round-trips \\textcolor{red}{text}', () => {
    const input = 'Hello \\textcolor{red}{world}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\textcolor{red}{world}')
  })

  it('round-trips \\section unchanged', () => {
    const input = '\\section{Hello}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\section{Hello}')
  })
})

describe('round-trip: lists', () => {
  it('round-trips itemize list', () => {
    const input = `\\begin{itemize}
\\item First item
\\item Second item
\\end{itemize}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{itemize}')
    expect(output).toContain('\\item First item')
    expect(output).toContain('\\item Second item')
    expect(output).toContain('\\end{itemize}')
  })

  it('round-trips enumerate list', () => {
    const input = `\\begin{enumerate}
\\item Alpha
\\item Beta
\\end{enumerate}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{enumerate}')
    expect(output).toContain('\\item Alpha')
    expect(output).toContain('\\end{enumerate}')
  })

  it('round-trips nested lists', () => {
    const input = `\\begin{itemize}
\\item Outer
\\begin{enumerate}
\\item Inner
\\end{enumerate}
\\end{itemize}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{itemize}')
    expect(output).toContain('\\begin{enumerate}')
    expect(output).toContain('\\end{enumerate}')
    expect(output).toContain('\\end{itemize}')
  })
})

describe('round-trip: tables', () => {
  it('round-trips basic table', () => {
    const input = `\\begin{table}[h]
\\begin{tabular}{|c|c|}
  A & B \\\\
  1 & 2 \\\\
\\end{tabular}
\\caption{Test table}
\\end{table}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{table}')
    expect(output).toContain('A & B')
    expect(output).toContain('1 & 2')
    expect(output).toContain('\\caption{Test table}')
    expect(output).toContain('\\end{table}')
  })
})

describe('round-trip: math', () => {
  it('round-trips display math \\[...\\]', () => {
    const input = '\\[\nx^2 + y^2 = z^2\n\\]'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\[')
    expect(output).toContain('x^2 + y^2 = z^2')
    expect(output).toContain('\\]')
  })

  it('round-trips equation* environment', () => {
    const input = `\\begin{equation*}
E = mc^2
\\end{equation*}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{equation*}')
    expect(output).toContain('E = mc^2')
    expect(output).toContain('\\end{equation*}')
  })

  it('round-trips align* environment', () => {
    const input = `\\begin{align*}
a &= b \\\\
c &= d
\\end{align*}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{align*}')
    expect(output).toContain('\\end{align*}')
  })
})

describe('round-trip: figures', () => {
  it('round-trips image figure', () => {
    const input = `\\begin{figure}[ht]
  \\centering
  \\includegraphics[width=0.5\\textwidth]{image.png}
  \\caption{A figure}
\\end{figure}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{figure}')
    expect(output).toContain('\\includegraphics')
    expect(output).toContain('image.png')
    expect(output).toContain('\\caption{A figure}')
    expect(output).toContain('\\end{figure}')
  })
})

describe('round-trip: callouts', () => {
  it('round-trips theorem with title', () => {
    const input = `\\begin{theorem}[Pythagorean]
For right triangles, $a^2 + b^2 = c^2$.
\\end{theorem}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{theorem}[Pythagorean]')
    expect(output).toContain('\\end{theorem}')
  })

  it('round-trips proof environment', () => {
    const input = `\\begin{proof}
Obvious.
\\end{proof}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{proof}')
    expect(output).toContain('\\end{proof}')
  })
})

describe('round-trip: footnotes', () => {
  it('round-trips \\footnote{text}', () => {
    const doc = parseLatex('Hello\\footnote{A note} world')
    const output = generateLatex(doc)
    expect(output).toContain('\\footnote{A note}')
  })
})

describe('round-trip: inline formatting', () => {
  it('round-trips bold text', () => {
    const doc = parseLatex('Hello \\textbf{bold} world')
    const output = generateLatex(doc)
    expect(output).toContain('\\textbf{bold}')
  })

  it('round-trips italic text', () => {
    const doc = parseLatex('Hello \\textit{italic} world')
    const output = generateLatex(doc)
    expect(output).toContain('\\textit{italic}')
  })

  it('round-trips href link', () => {
    const doc = parseLatex('\\href{https://example.com}{click here}')
    const output = generateLatex(doc)
    expect(output).toContain('\\href{https://example.com}{click here}')
  })

  it('round-trips inline math', () => {
    const doc = parseLatex('The formula $E=mc^2$ is famous')
    const output = generateLatex(doc)
    expect(output).toContain('$E=mc^2$')
  })
})
