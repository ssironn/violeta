# LaTeX Blocks Design

## Problem

Violeta's visual editor and compiled PDF show different things. The root cause: `generateLatex.ts` wraps paragraph text in `$...$` (math mode), making all body text render in math italic font in the PDF. Beyond that, the editor has no concept of "blocks" — it's a freeform rich text editor that happens to export LaTeX.

## Solution

Adopt a Notion-style block model where every block in the editor maps 1:1 to a LaTeX construct. Add block handles, slash commands, and a raw LaTeX escape hatch.

## Block Types

| Block | Visual | LaTeX Output |
|---|---|---|
| Paragraph | Normal text | Escaped text (no `$...$`) |
| Heading (1-4) | Styled heading | `\section{}`, `\subsection{}`, etc. |
| Inline Math | KaTeX inline | `$...$` |
| Block Math | KaTeX centered | `\[...\]` |
| Bullet List | Bulleted items | `\begin{itemize}...\end{itemize}` |
| Ordered List | Numbered items | `\begin{enumerate}...\end{enumerate}` |
| Blockquote | Indented quote | `\begin{quote}...\end{quote}` |
| Code Block | Monospace dark | `\begin{verbatim}...\end{verbatim}` |
| Image | Rendered image | `\begin{figure}...\end{figure}` |
| Horizontal Rule | Thin line | `\noindent\rule{\textwidth}{0.4pt}` |
| Raw LaTeX | Code + preview | Verbatim (no escaping) |

## Phase 1 — Fix LaTeX Generation

The critical one-line fix in `generateLatex.ts`:

- Remove `$...$` wrapper from paragraphs
- Enable `escapeText = true` for paragraph content
- Inline math nodes within text naturally produce `$...$`

```typescript
case 'paragraph': {
  const text = processInlineContent(node, true)
  if (!text.trim()) return ''
  const align = getAlignment(node)
  return wrapAlignment(text, align)
}
```

## Phase 2 — Raw LaTeX Block

New TipTap node extension (`rawLatex`):

- **Attrs**: `content` (string) — the raw LaTeX source
- **Visual**: Code editor area (dark purple theme) with live KaTeX preview above
- **Generation**: Content inserted verbatim into document, no escaping
- **Parsing**: `parseLatex.ts` uses this as fallback for unrecognized constructs
- **Insertion**: Via `+` menu or `/latex` slash command

## Phase 3 — Block Handles

Notion-style drag handles on hover:

- Handle icon (`⠿`) appears on the left when hovering any block
- Click handle opens block options popover:
  - Block type label
  - Transform (convert to another type)
  - Alignment (left/center/right)
  - Duplicate
  - Delete
  - Move up / Move down

## Phase 4 — Slash Commands

TipTap extension for `/` command palette:

- Triggers on `/` typed at start of empty paragraph
- Searchable floating menu with categories:
  - **Texto**: Paragraph, H1, H2, H3
  - **Listas**: Bullet list, Ordered list, Blockquote
  - **Matematica**: Block math + all math templates
  - **Midia**: Image, Code block, Horizontal rule
  - **Avancado**: Raw LaTeX
- Arrow keys to navigate, Enter to select, Escape to dismiss
- The `+` button opens the same menu for mouse users

## What Stays The Same

- TipTap as editor engine
- All existing block types
- Math editor modals (fraction, integral, matrix, etc.)
- Right panel (LaTeX code + PDF preview)
- Upload/export .tex functionality
- Dark purple theme
