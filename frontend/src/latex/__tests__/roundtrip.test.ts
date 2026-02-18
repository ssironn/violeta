import { describe, it, expect } from 'vitest'
import { parseLatex, extractCustomPreamble } from '../parseLatex'
import { generateLatex } from '../generateLatex'

describe('round-trip: parse → generate', () => {
  it('round-trips \\section{...}', () => {
    const input = '\\section{Introduction}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\section{Introduction}')
  })

  it('round-trips \\subsection{...}', () => {
    const input = '\\subsection{Subtitle}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\subsection{Subtitle}')
  })

  it('round-trips \\section*{...} (starred)', () => {
    const input = '\\section*{Unnumbered}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\section*{Unnumbered}')
  })

  it('imports font-size heading and exports as \\section', () => {
    const input = '{\\Large \\textbf{Subtitle}}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\subsection{Subtitle}')
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

  it('round-trips \\subsubsection{...}', () => {
    const input = '\\subsubsection{Hello}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\subsubsection{Hello}')
  })

  it('imports \\section[short]{Full} and exports as \\section{Full}', () => {
    const input = '\\section[Short Title]{Full Title}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\section{Full Title}')
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

// ─── Gap 1: Standalone commands without args ────────────────────
describe('round-trip: standalone commands (Gap 1)', () => {
  it('preserves \\hfill as rawLatex inline', () => {
    const doc = parseLatex('Left\\hfill Right')
    const output = generateLatex(doc)
    expect(output).toContain('\\hfill')
  })

  it('preserves \\dots as rawLatex inline', () => {
    const doc = parseLatex('one, two, \\dots')
    const output = generateLatex(doc)
    expect(output).toContain('\\dots')
  })

  it('preserves \\ldots as rawLatex inline', () => {
    const doc = parseLatex('a, b, \\ldots, z')
    const output = generateLatex(doc)
    expect(output).toContain('\\ldots')
  })

  it('preserves \\relax as rawLatex inline', () => {
    const doc = parseLatex('Some text \\relax more text')
    const output = generateLatex(doc)
    expect(output).toContain('\\relax')
  })
})

// ─── Gap 2: SKIP_COMMANDS preserved ─────────────────────────────
describe('round-trip: formatting commands (Gap 2)', () => {
  it('preserves \\noindent', () => {
    const doc = parseLatex('\\noindent This paragraph has no indent')
    const output = generateLatex(doc)
    expect(output).toContain('\\noindent')
  })

  it('preserves \\centering', () => {
    const doc = parseLatex('\\centering Some centered text')
    const output = generateLatex(doc)
    expect(output).toContain('\\centering')
  })

  it('preserves \\setlength with args', () => {
    const doc = parseLatex('\\setlength{\\parindent}{0pt} Text')
    const output = generateLatex(doc)
    expect(output).toContain('\\setlength{\\parindent}{0pt}')
  })

  it('preserves \\linebreak', () => {
    const doc = parseLatex('Text before \\linebreak text after')
    const output = generateLatex(doc)
    expect(output).toContain('\\linebreak')
  })
})

// ─── Gap 3: FONT_COMMANDS preserved ─────────────────────────────
describe('round-trip: font commands (Gap 3)', () => {
  it('preserves \\Large{Title} via sourceCommand mark', () => {
    const doc = parseLatex('\\Large{Big Title}')
    const output = generateLatex(doc)
    expect(output).toContain('\\Large{Big Title}')
  })

  it('preserves \\textrm{text}', () => {
    const doc = parseLatex('Math: $x$ then \\textrm{roman text}')
    const output = generateLatex(doc)
    expect(output).toContain('\\textrm{roman text}')
  })

  it('preserves \\mbox{text}', () => {
    const doc = parseLatex('Use \\mbox{no break here}')
    const output = generateLatex(doc)
    expect(output).toContain('\\mbox{no break here}')
  })

  it('preserves {\\large text} brace-group form', () => {
    const doc = parseLatex('{\\large some large text}')
    const output = generateLatex(doc)
    expect(output).toContain('\\large{some large text}')
  })
})

// ─── Gap 4: \\label in figures ──────────────────────────────────
describe('round-trip: figure labels (Gap 4)', () => {
  it('preserves \\label inside figure', () => {
    const input = `\\begin{figure}[ht]
  \\centering
  \\includegraphics[width=0.5\\textwidth]{img.png}
  \\caption{A figure}
  \\label{fig:test}
\\end{figure}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\label{fig:test}')
    expect(output).toContain('\\caption{A figure}')
  })
})

// ─── Gap 5: Comments preserved ──────────────────────────────────
describe('round-trip: comments (Gap 5)', () => {
  it('preserves full-line comments as latexComment blocks', () => {
    const input = `\\section{Title}

% This is an important comment

Some text below.`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('% This is an important comment')
  })

  it('strips inline (end-of-line) comments', () => {
    const input = 'Hello world % this is inline'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('Hello world')
    expect(output).not.toContain('% this is inline')
  })
})

// ─── Gap 6: figure* preservation ────────────────────────────────
describe('round-trip: figure* (Gap 6)', () => {
  it('preserves figure* (double-column)', () => {
    const input = `\\begin{figure*}[ht]
  \\centering
  \\includegraphics[width=\\textwidth]{wide.png}
  \\caption{Wide figure}
\\end{figure*}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\begin{figure*}')
    expect(output).toContain('\\end{figure*}')
  })
})

// ─── Gap 7: Table column spec and rules ─────────────────────────
describe('round-trip: table column spec & rules (Gap 7)', () => {
  it('preserves custom column spec', () => {
    const input = `\\begin{table}[h]
\\begin{tabular}{|l|r|p{3cm}|}
  Name & Age & Bio \\\\
  Alice & 30 & Programmer \\\\
\\end{tabular}
\\end{table}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('{|l|r|p{3cm}|}')
  })

  it('preserves booktabs rules', () => {
    const input = `\\begin{table}[h]
\\begin{tabular}{lrc}
  \\toprule
  Name & Age & City \\\\
  \\midrule
  Alice & 30 & NY \\\\
  \\bottomrule
\\end{tabular}
\\end{table}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\toprule')
    expect(output).toContain('\\midrule')
    expect(output).toContain('\\bottomrule')
  })

  it('preserves hline rules', () => {
    const input = `\\begin{table}[h]
\\begin{tabular}{|c|c|}
  \\hline
  A & B \\\\
  \\hline
  1 & 2 \\\\
  \\hline
\\end{tabular}
\\end{table}`
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\hline')
    expect(output).not.toContain('\\toprule')
  })
})

// ─── Gap 10/11: Preamble extras ─────────────────────────────────
describe('round-trip: preamble extraction (Gaps 10, 11)', () => {
  it('extracts \\title, \\author, \\date from preamble', () => {
    const input = `\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath}
\\title{My Paper}
\\author{John Doe}
\\date{2024}
\\begin{document}
Hello
\\end{document}`
    const result = extractCustomPreamble(input)
    expect(result.customPreamble).toContain('\\title{My Paper}')
    expect(result.customPreamble).toContain('\\author{John Doe}')
    expect(result.customPreamble).toContain('\\date{2024}')
  })

  it('extracts extra documentclass options', () => {
    const input = `\\documentclass[12pt,a4paper,twocolumn,landscape]{article}
\\begin{document}
Hello
\\end{document}`
    const result = extractCustomPreamble(input)
    expect(result.extraDocClassOptions).toContain('twocolumn')
    expect(result.extraDocClassOptions).toContain('landscape')
    expect(result.extraDocClassOptions).not.toContain('12pt')
    expect(result.extraDocClassOptions).not.toContain('a4paper')
  })

  it('preserves unrecognized preamble commands', () => {
    const input = `\\documentclass[12pt]{article}
\\usepackage{amsmath}
\\makeatletter
\\setcitestyle{numbers}
\\begin{document}
Hello
\\end{document}`
    const result = extractCustomPreamble(input)
    expect(result.customPreamble).toContain('\\makeatletter')
    expect(result.customPreamble).toContain('\\setcitestyle{numbers}')
  })
})
