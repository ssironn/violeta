# LaTeX Round-Trip Fidelity Design

## Goal

Make LaTeX the source of truth. The DB stores raw LaTeX. The visual editor loads from LaTeX and saves back to LaTeX with zero compilation-breaking data loss. Anything the parser can't represent visually is preserved as opaque `rawLatex` blocks.

## Principle

**"If I can't render it, I preserve it."** — Every LaTeX construct either maps to a visual TipTap node (supported subset) or gets preserved as an opaque `rawLatex` node that passes through the round-trip untouched.

## Architecture

```
DB (LaTeX source)
  → parseLatex() → TipTap JSON → Visual Editor
  → generateLatex() ← TipTap JSON ← Visual Editor
DB (LaTeX source)
```

The round-trip must satisfy: `compile(generateLatex(parseLatex(source))) ≈ compile(source)` — same PDF output.

---

## Supported Subset (Editable Visually)

| LaTeX Construct | TipTap Node | Key Attrs |
|---|---|---|
| `\section{}`, `\section*{}`, etc | `heading` | `level`, `starred` |
| Plain text paragraphs | `paragraph` | `textAlign` |
| `\textbf{}`, `\textit{}`, `\underline{}`, `\emph{}` | marks: bold/italic/underline | — |
| `\texttt{}` | mark: code | — |
| `\href{url}{text}` | mark: link | `href` |
| `$...$` | `inlineMath` | `latex` |
| `\[...\]`, `$$...$$` | `blockMath` | `latex`, `format` |
| `\begin{equation*}`, `\begin{align*}`, etc | `mathEnvironment` | `environment`, `latex` |
| `\begin{itemize}` | `bulletList` | — |
| `\begin{enumerate}` | `orderedList` | — |
| `\begin{quote}` | `blockquote` | `environment` |
| `\begin{verbatim}` | `codeBlock` | `environment` |
| `\begin{theorem}`, `\begin{proof}`, etc | `calloutBlock` | `calloutType`, `title` |
| `\begin{table}` + `\begin{tabular}` | `latexTable` | `headers`, `rows`, `caption`, `position` |
| `\begin{figure}` + `\includegraphics` | `image` | `src`, `alt`, `position`, `options` |
| `\begin{center}`, `\begin{flushright}` | `paragraph` | `textAlign` |
| `\\` | `hardBreak` | — |
| `\quad`, `\;`, etc | `latexSpacing` | `command` |

**Everything else** → `rawLatex` (opaque, not visually editable, preserved in round-trip).

---

## Changes to parseLatex.ts

### 1. Inline Commands → rawLatex inline nodes

Today `SKIP_COMMANDS` silently discards `\label`, `\ref`, `\cite`, `\vspace`, etc.

**New behavior**: These become inline `rawLatex` nodes preserving the full command text:
```json
{ "type": "rawLatex", "attrs": { "content": "\\label{fig1}", "inline": true } }
```

In `parseInline()`, when encountering a command in the "preserve" set:
- Capture the command name + all its arguments (brace groups, optional brackets)
- Create a `rawLatex` inline node with the full text

Commands to preserve (move from SKIP_COMMANDS):
- `\label{...}`, `\ref{...}`, `\pageref{...}`, `\cite{...}` — references
- `\vspace{...}`, `\hspace{...}` — spacing with arguments
- `\phantom{...}`, `\hphantom{...}`, `\vphantom{...}` — phantoms

Commands that are truly no-ops in visual editor (keep skipping):
- `\maketitle`, `\tableofcontents`, `\centering`, `\raggedleft`, `\raggedright`
- `\indent`, `\noindent`, `\pagestyle{...}`, `\thispagestyle{...}`
- `\setlength{...}`, `\addtolength{...}`, `\setcounter{...}`, `\addtocounter{...}`

Standalone spacing commands with no args (`\vfill`, `\hfill`, `\smallskip`, `\medskip`, `\bigskip`, `\newpage`, `\clearpage`): become block-level `rawLatex` nodes.

### 2. Unknown Environments → rawLatex block nodes

Today: unknown environments have their inner content parsed as blocks, losing the wrapper.

**New behavior**: If `envName` is not in any known set, capture the entire `\begin{env}...\end{env}` as a `rawLatex` block:
```json
{ "type": "rawLatex", "attrs": { "content": "\\begin{tikzpicture}...\\end{tikzpicture}" } }
```

### 3. Preserve Metadata in Supported Nodes

| Issue | Fix |
|---|---|
| `\section*{}` loses star | Add `starred: boolean` attr to heading node |
| `$$...$$` becomes `\[...\]` | Add `format: "dollars" \| "brackets"` attr to blockMath |
| `\begin{quotation}` becomes `\begin{quote}` | Add `environment: string` attr to blockquote |
| `\begin{lstlisting}` becomes `\begin{verbatim}` | Add `environment: string` attr to codeBlock |
| `\begin{figure}[t!]` loses position | Add `position: string` attr to image |
| `\includegraphics[width=5cm]` loses options | Add `options: string` attr to image |
| `\begin{description}` becomes `\begin{itemize}` | Add `environment: string` attr to bulletList |
| `\begin{abstract}` becomes `\begin{quote}` | Add `environment: string` attr to blockquote |

### 4. List Items with Mixed Content

`parseListItems()` must always use `flatParseBlocks()` for item content when it contains `\begin{`. The item's content becomes an array of block nodes (paragraphs + math environments + etc).

`generateLatex` must join list item content with `\n` instead of `\n\n` to avoid breaking list structure.

### 5. Font Commands

Today: `FONT_COMMANDS` extracts content, discards the command.

**New behavior**: Unknown font/style commands with brace groups become inline `rawLatex`:
- Keep `\textrm`, `\textsf`, `\textsl`, `\textnormal` as pass-through (content only)
- Keep `\mbox`, `\text` as pass-through
- Size commands (`\large`, `\Large`, `\small`, etc.) → `rawLatex` inline (they affect layout)

---

## Changes to generateLatex.ts

### 1. Respect Node Metadata

```typescript
case 'heading': {
  const starred = node.attrs?.starred ? '*' : ''
  return `${cmd}${starred}{${text}}`
}

case 'blockMath': {
  const format = node.attrs?.format
  if (format === 'dollars') return `$$\n${latex}\n$$`
  return `\\[\n${latex}\n\\]`
}

case 'blockquote': {
  const env = node.attrs?.environment ?? 'quote'
  return `\\begin{${env}}\n${inner}\n\\end{${env}}`
}

case 'codeBlock': {
  const env = node.attrs?.environment ?? 'verbatim'
  return `\\begin{${env}}\n${code}\n\\end{${env}}`
}

case 'image': {
  const pos = node.attrs?.position ? `[${node.attrs.position}]` : '[h]'
  const opts = node.attrs?.options ?? 'width=0.8\\textwidth'
  // ...
}
```

### 2. rawLatex Pass-through

```typescript
case 'rawLatex': {
  return node.attrs?.content ?? ''
}
```

This already exists but now handles both block and inline rawLatex nodes.

### 3. List Item Content Joining

Change `processNodes` joining for list items from `\n\n` to `\n`:
```typescript
case 'bulletList': {
  const items = (node.content ?? [])
    .map((item) => {
      const inner = processNodes(item.content ?? [], '\n')  // not \n\n
      return `  \\item ${inner}`
    })
}
```

---

## Changes to TipTap Extensions

### rawLatex Extension
- Already exists. May need to support both block and inline rendering.
- Inline rawLatex: renders as a small badge/chip showing the command (e.g., `\label{fig1}`)
- Block rawLatex: renders as a code block with syntax highlighting (already works)

### Heading Extension
- Add `starred` attribute (boolean, default false)

### BlockMath Extension
- Add `format` attribute (string: `"dollars"` | `"brackets"`, default `"brackets"`)

### Other Extensions
- `blockquote`: add `environment` attr
- `codeBlock`: add `environment` attr
- `image`: add `position` and `options` attrs
- `bulletList`: add `environment` attr (for `description`)

---

## Testing Strategy

For each supported construct:
1. Write LaTeX source with the construct
2. Parse with `parseLatex()`
3. Generate with `generateLatex()`
4. Verify the output compiles and produces equivalent result
5. Parse again and verify the TipTap JSON is identical (idempotent)

Key test cases:
- Document with `\label`/`\ref` inside paragraphs
- List items containing `\begin{equation*}...\end{equation*}`
- `\section*{}` headings
- Mixed `$$...$$` and `\[...\]` display math
- Unknown environments (tikzpicture, etc.)
- Custom preamble with `\newcommand`, `\newtheorem`
- Nested environments (list inside callout inside list)

---

## Non-Goals

- Visual editing of rawLatex content (users edit in LaTeX tab)
- Supporting Beamer/slides
- Bibliography management (`\bibliography` preserved as rawLatex)
- TikZ rendering in visual editor
