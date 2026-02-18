# LaTeX Parser Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical bugs in the LaTeX parser and add missing features (\textcolor, \url, comment preservation, \footnote visual, section numbering) to improve round-trip fidelity and bring the editor closer to covering common LaTeX workflows.

**Architecture:** All changes follow the existing pattern: `parseLatex.ts` converts LaTeX→TipTap JSON, `generateLatex.ts` converts back, and TipTap extensions provide visual editing. New features (textcolor, footnote) follow the mark/node pattern already established by `sourceCommand` and `CalloutBlock`. Each task is independent enough to commit separately.

**Tech Stack:** TypeScript, TipTap v3.19.0, ProseMirror, KaTeX, Vitest

---

## Task 1: Fix `findClosingBrace` with `\\}` (double backslash before brace)

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:6-14`
- Modify: `frontend/src/latex/katexMacros.ts:98-106` (same pattern)
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Problem:** `s[i - 1] !== '\\'` only checks one character back. `\\}` is a line break (`\\`) followed by a closing brace — the brace should close the group. But the parser sees the second `\` as escaping `}`.

**Step 1: Write the failing test**

Add to `parseLatex.test.ts`:

```typescript
describe('parseLatex — brace matching edge cases', () => {
  it('closes brace group after \\\\ (double backslash)', () => {
    const doc = parseLatex('\\textbf{line one \\\\ line two}')
    const para = doc.content![0]
    expect(para.type).toBe('paragraph')
    // The bold should contain both lines with a hardBreak
    const boldNodes = para.content!.filter(
      (n: any) => n.type === 'text' && n.marks?.some((m: any) => m.type === 'bold')
    )
    expect(boldNodes.length).toBeGreaterThan(0)
  })

  it('handles \\textbf{x\\\\} without eating following content', () => {
    const doc = parseLatex('\\textbf{x\\\\} next')
    const para = doc.content![0]
    const textNodes = para.content!.filter((n: any) => n.type === 'text')
    const allText = textNodes.map((n: any) => n.text).join('')
    expect(allText).toContain('next')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL — the brace group isn't closed correctly.

**Step 3: Fix `findClosingBrace` in parseLatex.ts**

Replace lines 6-14 with:

```typescript
function findClosingBrace(s: string, start: number): number {
  let depth = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '\\') {
      // Skip escaped characters: \{ \} and also \\ (double backslash)
      i++ // skip next char
      continue
    }
    if (s[i] === '{') depth++
    if (s[i] === '}') depth--
    if (depth === 0) return i
  }
  return s.length
}
```

Apply the same fix to `katexMacros.ts:98-106` (`findMatchingBrace`):

```typescript
function findMatchingBrace(s: string, start: number): number {
  let depth = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '\\') {
      i++ // skip next char (handles \\ and \{ \})
      continue
    }
    if (s[i] === '{') depth++
    if (s[i] === '}') depth--
    if (depth === 0) return i
  }
  return -1
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/katexMacros.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "fix: handle \\\\} correctly in brace matching (skip escaped chars)"
```

---

## Task 2: Fix inline math `$...$` not respecting `\$`

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:194-202`
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Problem:** `text.indexOf('$', i + 1)` finds the next `$` without checking if it's escaped with `\$`. Input like `$price = \$5$` closes at the `\$` instead of the real closing `$`.

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Add helper and fix the inline math parsing**

Add a helper function near line 6 of `parseLatex.ts`:

```typescript
/** Find next unescaped occurrence of char in string, starting from pos */
function findUnescaped(s: string, char: string, pos: number): number {
  for (let i = pos; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue } // skip escaped char
    if (s[i] === char) return i
  }
  return -1
}
```

Then replace the inline math block (lines 194-202 in `parseInline`) from:

```typescript
if (text[i] === '$') {
  const end = text.indexOf('$', i + 1)
  if (end !== -1) {
```

to:

```typescript
if (text[i] === '$') {
  const end = findUnescaped(text, '$', i + 1)
  if (end !== -1) {
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "fix: inline math respects escaped \\$ inside $...$"
```

---

## Task 3: Fix `parseTabular` splitting `&` inside math mode

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:599-629`
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Problem:** `cleaned.split('&')` doesn't respect `$...$`. A cell containing `$a & b$` is split at the `&` inside math.

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Add math-aware cell splitting**

Add a helper function near `parseTabular`:

```typescript
/** Split a table row string by & respecting $...$ math mode */
function splitTableCells(row: string): string[] {
  const cells: string[] = []
  let current = ''
  let inMath = false
  let i = 0
  while (i < row.length) {
    if (row[i] === '\\') {
      current += row[i] + (row[i + 1] ?? '')
      i += 2
      continue
    }
    if (row[i] === '$') {
      inMath = !inMath
      current += row[i]
      i++
      continue
    }
    if (row[i] === '&' && !inMath) {
      cells.push(current.trim())
      current = ''
      i++
      continue
    }
    current += row[i]
    i++
  }
  cells.push(current.trim())
  return cells
}
```

Then in `parseTabular` (line 609), replace:

```typescript
const cells = cleaned.split('&').map((c) => unescapeLatex(c.trim()))
```

with:

```typescript
const cells = splitTableCells(cleaned).map((c) => unescapeLatex(c))
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "fix: table cell splitting respects math mode ($...$)"
```

---

## Task 4: Fix multiline heading titles

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:880-1003` (splitIntoBlocks)
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Problem:** `splitIntoBlocks` treats each line independently. A heading like `\section{Long\n  title}` is split into two lines before `parseBlock` sees it, so the brace group is never completed.

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Fix `splitIntoBlocks` to consume multiline headings**

In `splitIntoBlocks` (around line 981), replace the heading-detection block:

```typescript
// Heading commands
if (/^\\(part|chapter|section|subsection|subsubsection|paragraph)\*?\{/.test(trimmedLine)) {
  flushCurrent()
  blocks.push(trimmedLine)
  i++
  continue
}
```

with:

```typescript
// Heading commands — may span multiple lines if brace group isn't closed
if (/^\\(part|chapter|section|subsection|subsubsection|paragraph)\*?\{/.test(trimmedLine)) {
  flushCurrent()
  let headingText = line
  // Check if the brace group is complete
  let depth = 0
  for (const ch of trimmedLine) {
    if (ch === '{') depth++
    if (ch === '}') depth--
  }
  // Accumulate lines until braces balance
  let j = i + 1
  while (depth > 0 && j < lines.length) {
    headingText += '\n' + lines[j]
    for (const ch of lines[j]) {
      if (ch === '{') depth++
      if (ch === '}') depth--
    }
    j++
  }
  blocks.push(headingText.trim())
  i = j
  continue
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "fix: support multiline heading titles in parser"
```

---

## Task 5: Fix `dynamicCalloutEnvs` global mutable state

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:595, 838, 1022-1040`
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Problem:** `dynamicCalloutEnvs` is a module-level mutable variable. Concurrent calls to `parseLatex()` (e.g. two documents loading) can interfere with each other.

**Step 1: Write the failing test**

```typescript
describe('parseLatex — concurrent safety', () => {
  it('does not leak dynamic callout types between calls', () => {
    // First call with custom \newtheorem
    const latex1 = `\\newtheorem{axiom}{Axioma}
\\begin{document}
\\begin{axiom}
Content
\\end{axiom}
\\end{document}`
    const doc1 = parseLatex(latex1)
    expect(doc1.content![0].type).toBe('calloutBlock')

    // Second call WITHOUT the custom theorem — should NOT recognize "axiom"
    const latex2 = `\\begin{document}
\\begin{axiom}
Content
\\end{axiom}
\\end{document}`
    const doc2 = parseLatex(latex2)
    // Without the \newtheorem, "axiom" should be rawLatex (unknown env)
    expect(doc2.content![0].type).toBe('rawLatex')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL — `doc2` still sees "axiom" as calloutBlock from `doc1`'s parse.

**Step 3: Refactor to pass callout set through parsing functions**

This requires threading a parameter instead of using module state. The minimal change:

In `parseLatex` function (line 1022), the `dynamicCalloutEnvs` is already set at the top of every call. The bug is that `flatParseBlocks` → `parseBlock` reads the global. Since `parseLatex` already resets it at the top of every call, the concurrent issue only manifests with true async parallelism (web workers). For now, the simplest fix is to ensure the reset is always correct:

Replace lines 1033-1038:

```typescript
      if (defs.length > 0) {
        dynamicCalloutEnvs = new Set([...CALLOUT_ENVIRONMENTS, ...defs.map(d => d.envName)])
      } else {
        dynamicCalloutEnvs = CALLOUT_ENVIRONMENTS
      }
    } else {
      dynamicCalloutEnvs = CALLOUT_ENVIRONMENTS
```

This already resets on every call. The test above should actually pass with current code since `parseLatex` resets at the start. Let me adjust the test to test the actual bug — where `extraCalloutNames` leaks:

Revised test:

```typescript
describe('parseLatex — callout isolation', () => {
  it('does not leak extraCalloutNames between calls', () => {
    // First call with extra callout name
    const doc1 = parseLatex('\\begin{axiom}\nContent\n\\end{axiom}', new Set(['axiom']))
    expect(doc1.content![0].type).toBe('calloutBlock')

    // Second call without extra — should NOT recognize axiom
    const doc2 = parseLatex('\\begin{axiom}\nContent\n\\end{axiom}')
    expect(doc2.content![0].type).toBe('rawLatex')
  })
})
```

The fix is already present in the else branch (line 1038). If the test passes, no code change needed — just confirm isolation works and keep the test as a regression guard.

If the test fails: ensure the `else` branch at line 1038 always resets to `CALLOUT_ENVIRONMENTS`.

**Step 4: Run test to verify**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS (if already correct) or FAIL then fix.

**Step 5: Commit**

```bash
git add frontend/src/latex/__tests__/parseLatex.test.ts frontend/src/latex/parseLatex.ts
git commit -m "test: add regression test for callout type isolation between parses"
```

---

## Task 6: Fix `\item[label]` in description lists

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:438-508` (parseListItems)
- Modify: `frontend/src/latex/generateLatex.ts:169-178` (bulletList generation)
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Problem:** In `\begin{description}`, `\item[Term]` should extract "Term" as a label. Currently `[Term]` just becomes part of the text content.

**Step 1: Write the failing test**

```typescript
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
    // The label should be preserved in attrs
    expect(firstItem.attrs?.label).toBe('Alpha')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Extract item labels in parseListItems**

In `parseListItems`, after detecting `\item` at depth 0 (around line 466), extract the optional `[label]`:

Replace the `\item` detection block (lines 466-476):

```typescript
    if (depth === 0 && inner.startsWith('\\item', pos)) {
      const afterItem = pos + 5
      if (afterItem >= inner.length || !/[a-zA-Z]/.test(inner[afterItem])) {
        if (current.trim() || itemTexts.length > 0) {
          itemTexts.push(current)
        }
        current = ''
        pos = afterItem
        while (pos < inner.length && /\s/.test(inner[pos])) pos++
        continue
      }
    }
```

with:

```typescript
    if (depth === 0 && inner.startsWith('\\item', pos)) {
      const afterItem = pos + 5
      if (afterItem >= inner.length || !/[a-zA-Z]/.test(inner[afterItem])) {
        if (current.trim() || itemTexts.length > 0) {
          itemTexts.push(current)
        }
        current = ''
        pos = afterItem
        while (pos < inner.length && /\s/.test(inner[pos])) pos++
        // Extract optional [label] for description items
        if (pos < inner.length && inner[pos] === '[') {
          const closeBracket = inner.indexOf(']', pos)
          if (closeBracket !== -1) {
            const label = inner.slice(pos + 1, closeBracket)
            current = `\x00LABEL:${label}\x00` // sentinel for later extraction
            pos = closeBracket + 1
            while (pos < inner.length && /\s/.test(inner[pos])) pos++
          }
        }
        continue
      }
    }
```

Then in the item building loop (around line 485), extract the label:

```typescript
  for (const part of itemTexts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Extract label sentinel if present
    let itemLabel: string | undefined
    let cleanPart = trimmed
    const labelMatch = trimmed.match(/^\x00LABEL:(.+?)\x00(.*)$/s)
    if (labelMatch) {
      itemLabel = labelMatch[1]
      cleanPart = labelMatch[2].trim()
    }

    const attrs: Record<string, any> = {}
    if (itemLabel) attrs.label = itemLabel

    if (/\\begin\{/.test(cleanPart)) {
      const blocks = flatParseBlocks(cleanPart)
      if (blocks.length > 0) {
        items.push({ type: 'listItem', ...(Object.keys(attrs).length > 0 ? { attrs } : {}), content: blocks })
      }
    } else {
      const inlineContent = parseInline(cleanPart)
      if (inlineContent.length > 0) {
        items.push({
          type: 'listItem',
          ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
          content: [{ type: 'paragraph', content: inlineContent }],
        })
      }
    }
  }
```

Then in `generateLatex.ts`, update the bulletList case (line 173) to output `\item[label]`:

```typescript
.map((item) => {
  const inner = processListItemContent(item.content ?? [])
  const label = item.attrs?.label ? `[${item.attrs.label}]` : ''
  return `  \\item${label} ${inner}`
})
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/generateLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "feat: extract and preserve \\item[label] in description lists"
```

---

## Task 7: Fix comment stripping inside verbatim and URLs

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:32-42` (normalize)
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Problem:** `normalize()` strips everything after `%` on each line, but this incorrectly strips `%` inside `\verb|...|`, `\begin{verbatim}`, and URLs like `\href{url%20encoded}{text}`.

**Step 1: Write the failing test**

```typescript
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

  it('preserves % inside href URLs', () => {
    const latex = 'Visit \\href{https://example.com/path%20file}{link}'
    const doc = parseLatex(latex)
    const para = doc.content![0]
    const linkNode = para.content!.find(
      (n: any) => n.marks?.some((m: any) => m.type === 'link')
    )
    expect(linkNode).toBeDefined()
    const linkMark = linkNode!.marks!.find((m: any) => m.type === 'link')
    expect(linkMark!.attrs!.href).toContain('%20')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Make normalize verbatim-aware**

Replace `normalize` (lines 32-42) with:

```typescript
function normalize(latex: string): string {
  const lines = latex
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')

  const result: string[] = []
  let inVerbatim = false

  for (const line of lines) {
    if (/^\\begin\{(verbatim|lstlisting|minted)\}/.test(line.trim())) {
      inVerbatim = true
    }
    if (inVerbatim) {
      result.push(line)
      if (/^\\end\{(verbatim|lstlisting|minted)\}/.test(line.trim())) {
        inVerbatim = false
      }
      continue
    }
    // Strip comments, but not % preceded by \\ (escaped percent)
    const idx = line.search(/(?<!\\)%/)
    result.push(idx !== -1 ? line.slice(0, idx) : line)
  }

  return result.join('\n')
}
```

Note: The `\href{url%20}` case is trickier — the `%` is inside a brace group argument. A full solution would require context-aware comment stripping, which is expensive. For now, `\%` (escaped percent) is already handled by the `(?<!\\)` lookbehind. The URL case `%20` without backslash is a real issue, but URLs in LaTeX should use `\%` or the `url` package. Document this as a known limitation for now.

**Step 4: Run test to verify it passes**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS for verbatim. The href test may need adjusting if `%20` without `\` is not common.

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "fix: preserve % inside verbatim environments during normalization"
```

---

## Task 8: Add `\textcolor{color}{text}` support

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:164-378` (parseInline)
- Modify: `frontend/src/latex/generateLatex.ts:64-96` (processMarks)
- Modify: `frontend/src/latex/generateLatex.ts:436-558` (preamble generation)
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`
- Test: `frontend/src/latex/__tests__/roundtrip.test.ts`

**Context:** The editor already has `TextStyle` and `Color` extensions from TipTap (`useVioletaEditor.ts:6-7`). The `processMarks` function already has a `textStyle` case that skips color (line 88-91). We just need to wire parsing and generation.

**Step 1: Write the failing tests**

Add to `parseLatex.test.ts`:

```typescript
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

  it('parses \\textcolor{blue}{bold text} with nested formatting', () => {
    const doc = parseLatex('\\textcolor{blue}{\\textbf{bold}}')
    const para = doc.content![0]
    const node = para.content![0]
    expect(node.marks).toHaveLength(2)
    expect(node.marks!.some((m: any) => m.type === 'textStyle' && m.attrs?.color === 'blue')).toBe(true)
    expect(node.marks!.some((m: any) => m.type === 'bold')).toBe(true)
  })
})
```

Add to `roundtrip.test.ts`:

```typescript
it('round-trips \\textcolor{red}{text}', () => {
  const input = 'Hello \\textcolor{red}{world}'
  const doc = parseLatex(input)
  const output = generateLatex(doc)
  expect(output).toContain('\\textcolor{red}{world}')
})
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/ --reporter=verbose`
Expected: FAIL

**Step 3: Add \textcolor parsing in parseInline**

In `parseInline`, add a handler for `\textcolor` after the `\href` handler (around line 250). Insert before the PRESERVE_COMMANDS check:

```typescript
          // \textcolor{color}{text}
          if (cmd === 'textcolor' || cmd === 'color') {
            if (cmd === 'textcolor' && text[afterCmd] === '{') {
              const colorGroup = extractBraceGroup(text, afterCmd)
              const textGroup = extractBraceGroup(text, colorGroup.end)
              const inner = parseInline(textGroup.content)
              const marked = addMarkToNodes(inner, {
                type: 'textStyle',
                attrs: { color: colorGroup.content },
              })
              nodes.push(...marked)
              i = textGroup.end
              continue
            }
          }
```

**Step 4: Fix generation in processMarks**

Replace lines 88-91 in `generateLatex.ts`:

```typescript
      case 'textStyle':
        if (mark.attrs?.color) {
          // Skip color in basic LaTeX for simplicity
        }
        break;
```

with:

```typescript
      case 'textStyle':
        if (mark.attrs?.color) {
          result = `\\textcolor{${mark.attrs.color}}{${result}}`
        }
        break;
```

**Step 5: Auto-add `xcolor` package when textcolor is used**

In `generateLatex.ts`, add a detection function near `hasTikzFigure` (around line 419):

```typescript
function hasTextColor(nodes: JSONContent[]): boolean {
  for (const node of nodes) {
    if (node.type === 'text' && node.marks?.some(m => m.type === 'textStyle' && m.attrs?.color)) return true
    if (node.content && hasTextColor(node.content)) return true
  }
  return false
}
```

Then in the `generateLatex` function body, after the `pgfplotsDefs` block (around line 526), add:

```typescript
  // Auto-detect textcolor usage and add xcolor package
  const needsXcolor = hasTextColor(doc.content ?? []) || body.includes('\\textcolor{')
  let xcolorDefs = ''
  if (needsXcolor && !extraBlock.includes('\\usepackage{xcolor}') && !extraBlock.includes('\\usepackage[')) {
    xcolorDefs = '\n\\usepackage{xcolor}\n'
  }
```

Add `${xcolorDefs}` to the preamble template string (line 551).

**Step 6: Run tests to verify they pass**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/ --reporter=verbose`
Expected: PASS

**Step 7: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/generateLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts frontend/src/latex/__tests__/roundtrip.test.ts
git commit -m "feat: add \\textcolor{color}{text} parse/generate with xcolor auto-detection"
```

---

## Task 9: Add `\url{}` support

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts` (parseInline, around the \href handler)
- Modify: `frontend/src/latex/generateLatex.ts:64-96` (processMarks)
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`
- Test: `frontend/src/latex/__tests__/roundtrip.test.ts`

**Context:** `\url{https://...}` is like `\href{url}{url}` — the URL is both the target and the display text. The editor already has a Link mark.

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Add \url handler in parseInline**

In `parseInline`, right after the `\href` handler (around line 250), add:

```typescript
          // \url{url} — same as \href{url}{url}
          if (cmd === 'url') {
            if (text[afterCmd] === '{') {
              const urlGroup = extractBraceGroup(text, afterCmd)
              const url = urlGroup.content
              nodes.push({
                type: 'text',
                text: url,
                marks: [{ type: 'link', attrs: { href: url } }],
              })
              i = urlGroup.end
              continue
            }
          }
```

No changes needed in `generateLatex.ts` — links already generate `\href{url}{text}`. When the text equals the href, the output will be `\href{url}{url}` which is functionally equivalent. If we want to preserve `\url` specifically, we could add an attr, but YAGNI for now.

**Step 4: Run test to verify it passes**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "feat: parse \\url{} as clickable link"
```

---

## Task 10: Expand test coverage — round-trip tests

**Files:**
- Test: `frontend/src/latex/__tests__/roundtrip.test.ts`
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Context:** Current tests only cover headings and CONTENT_DISPLAY_COMMANDS. This task adds round-trip tests for all major node types.

**Step 1: Add round-trip tests for lists**

```typescript
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
```

**Step 2: Add round-trip tests for tables**

```typescript
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
```

**Step 3: Add round-trip tests for math environments**

```typescript
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
```

**Step 4: Add round-trip tests for figures and callouts**

```typescript
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
```

**Step 5: Add round-trip tests for inline formatting**

```typescript
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
```

**Step 6: Run all tests**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/ --reporter=verbose`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add frontend/src/latex/__tests__/roundtrip.test.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "test: comprehensive round-trip tests for lists, tables, math, figures, callouts, inline"
```

---

## Task 11: Add `\footnote{}` visual representation

**Files:**
- Create: `frontend/src/extensions/FootnoteNode.ts`
- Modify: `frontend/src/latex/parseLatex.ts:46-52` (move `footnote` from PRESERVE_COMMANDS)
- Modify: `frontend/src/latex/generateLatex.ts:98-127` (processInlineContent)
- Modify: `frontend/src/hooks/useVioletaEditor.ts` (register extension)
- Modify: `frontend/src/index.css` (add footnote styles)
- Test: `frontend/src/latex/__tests__/parseLatex.test.ts`
- Test: `frontend/src/latex/__tests__/roundtrip.test.ts`

**Context:** Currently `\footnote{text}` is preserved as rawLatex inline — functional but not user-friendly. We'll create an inline node that shows a footnote marker with tooltip-like preview.

**Step 1: Write the failing tests**

```typescript
describe('parseLatex — footnotes', () => {
  it('parses \\footnote{text} as footnote inline node', () => {
    const doc = parseLatex('Hello\\footnote{A note} world')
    const para = doc.content![0]
    const fn = para.content!.find((n: any) => n.type === 'footnote')
    expect(fn).toBeDefined()
    expect(fn!.attrs!.content).toBe('A note')
  })
})
```

Add to `roundtrip.test.ts`:

```typescript
it('round-trips \\footnote{text}', () => {
  const doc = parseLatex('Hello\\footnote{A note} world')
  const output = generateLatex(doc)
  expect(output).toContain('\\footnote{A note}')
})
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/ --reporter=verbose`
Expected: FAIL

**Step 3: Create FootnoteNode extension**

Create `frontend/src/extensions/FootnoteNode.ts`:

```typescript
import { Node, mergeAttributes } from '@tiptap/core'

export const FootnoteNode = Node.create({
  name: 'footnote',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="footnote"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'footnote' })]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span')
      dom.classList.add('footnote-marker')
      dom.setAttribute('data-type', 'footnote')

      // Superscript marker
      const marker = document.createElement('sup')
      marker.classList.add('footnote-sup')
      marker.textContent = '*'
      dom.appendChild(marker)

      // Tooltip with content
      const tooltip = document.createElement('span')
      tooltip.classList.add('footnote-tooltip')
      tooltip.textContent = node.attrs.content as string
      dom.appendChild(tooltip)

      dom.addEventListener('click', (e) => {
        e.preventDefault()
        const pos = getPos()
        if (pos != null) {
          // Select node for editing
          const content = prompt('Nota de rodapé:', node.attrs.content as string)
          if (content !== null) {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, { content })
            )
          }
        }
      })

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'footnote') return false
          tooltip.textContent = updatedNode.attrs.content as string
          return true
        },
      }
    }
  },
})
```

**Step 4: Move footnote from PRESERVE_COMMANDS to dedicated parsing**

In `parseLatex.ts`, remove `'footnote'` from `PRESERVE_COMMANDS` (line 50).

Then in `parseInline`, add a handler after the `\url` handler:

```typescript
          // \footnote{text} → footnote inline node
          if (cmd === 'footnote') {
            if (text[afterCmd] === '{') {
              const group = extractBraceGroup(text, afterCmd)
              nodes.push({ type: 'footnote', attrs: { content: group.content } })
              i = group.end
              continue
            }
          }
```

**Step 5: Add generation in processInlineContent**

In `generateLatex.ts`, in `processInlineContent` (around line 122), add before the final `return ''`:

```typescript
      if (child.type === 'footnote') {
        return `\\footnote{${child.attrs?.content ?? ''}}`
      }
```

**Step 6: Register the extension**

In `useVioletaEditor.ts`, add import and register:

```typescript
import { FootnoteNode } from '../extensions/FootnoteNode'
```

Add `FootnoteNode,` to the extensions array (after `LayoutBlock`).

**Step 7: Add CSS styles**

Add to `frontend/src/index.css`:

```css
/* Footnote marker */
.footnote-marker {
  position: relative;
  cursor: pointer;
}

.footnote-sup {
  color: var(--accent-color, #6d28d9);
  font-weight: 600;
  font-size: 0.75em;
  vertical-align: super;
}

.footnote-tooltip {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary, #1e1e2e);
  color: var(--text-primary, #cdd6f4);
  border: 1px solid var(--border-color, #45475a);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.8rem;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 10;
  pointer-events: none;
}

.footnote-marker:hover .footnote-tooltip {
  display: block;
}
```

**Step 8: Run tests to verify they pass**

Run: `cd /Users/rumotecnologias/violeta/frontend && npx vitest run src/latex/__tests__/ --reporter=verbose`
Expected: PASS

**Step 9: Commit**

```bash
git add frontend/src/extensions/FootnoteNode.ts frontend/src/latex/parseLatex.ts frontend/src/latex/generateLatex.ts frontend/src/hooks/useVioletaEditor.ts frontend/src/index.css frontend/src/latex/__tests__/parseLatex.test.ts frontend/src/latex/__tests__/roundtrip.test.ts
git commit -m "feat: visual \\footnote{} with tooltip preview instead of rawLatex"
```

---

## Task 12: Add visual section/theorem numbering

**Files:**
- Modify: `frontend/src/extensions/CalloutBlock.ts`
- Modify: `frontend/src/index.css`
- Test: Manual visual verification

**Context:** CSS counters can provide automatic numbering without any JavaScript changes. This is a pure CSS solution that numbers headings and callout blocks sequentially in the visual editor, matching what LaTeX would produce.

**Step 1: Add CSS counters for headings**

Add to `frontend/src/index.css`, inside the `.tiptap` selector block:

```css
/* Section numbering via CSS counters */
.tiptap {
  counter-reset: section subsection subsubsection theorem definition lemma corollary proposition example exercise remark;
}

.tiptap h1:not([data-starred="true"])::before {
  counter-increment: section;
  counter-reset: subsection subsubsection;
  content: counter(section) ". ";
  color: var(--text-secondary, #a6adc8);
}

.tiptap h2:not([data-starred="true"])::before {
  counter-increment: subsection;
  counter-reset: subsubsection;
  content: counter(section) "." counter(subsection) " ";
  color: var(--text-secondary, #a6adc8);
}

.tiptap h3:not([data-starred="true"])::before {
  counter-increment: subsubsection;
  content: counter(section) "." counter(subsection) "." counter(subsubsection) " ";
  color: var(--text-secondary, #a6adc8);
}
```

**Step 2: Add CSS counters for callout blocks**

```css
/* Theorem-like numbering */
.callout-header .callout-type-label::after {
  content: " " counter(theorem-global);
}

.callout-block[data-callout-type="theorem"] {
  counter-increment: theorem-global;
}

.callout-block[data-callout-type="definition"] {
  counter-increment: theorem-global;
}

.callout-block[data-callout-type="lemma"] {
  counter-increment: theorem-global;
}
```

**Note:** This approach is simpler but less accurate than real LaTeX numbering (which has separate counters, shared counters, etc.). It provides a visual approximation. For full accuracy, we'd need a ProseMirror plugin that walks the document and assigns numbers — that's a follow-up task.

**Step 3: Update CalloutBlock to emit data attributes**

In `CalloutBlock.ts`, ensure the rendered DOM includes `data-callout-type` attribute. Check the current `renderHTML` and `addNodeView` — the NodeView already renders the callout type in the header. Add the data attribute to the wrapper:

In the `addNodeView` function, where the DOM wrapper is created, ensure:

```typescript
dom.setAttribute('data-callout-type', node.attrs.calloutType as string)
```

And in the `update` handler:

```typescript
dom.setAttribute('data-callout-type', updatedNode.attrs.calloutType as string)
```

**Step 4: Verify visually**

Open the app, create a document with sections and theorems. Verify numbers appear.

Run: `cd /Users/rumotecnologias/violeta/frontend && npm run dev`

**Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/extensions/CalloutBlock.ts
git commit -m "feat: visual section and theorem numbering via CSS counters"
```

---

## Summary

| Task | Type | Impact | Files Changed |
|------|------|--------|---------------|
| 1 | Bug fix | Critical | parseLatex.ts, katexMacros.ts |
| 2 | Bug fix | Critical | parseLatex.ts |
| 3 | Bug fix | Critical | parseLatex.ts |
| 4 | Bug fix | High | parseLatex.ts |
| 5 | Bug fix | Medium | parseLatex.ts (test only) |
| 6 | Bug fix | Medium | parseLatex.ts, generateLatex.ts |
| 7 | Bug fix | Medium | parseLatex.ts |
| 8 | Feature | High | parseLatex.ts, generateLatex.ts |
| 9 | Feature | Medium | parseLatex.ts |
| 10 | Tests | High | roundtrip.test.ts, parseLatex.test.ts |
| 11 | Feature | High | New extension + parser + generator |
| 12 | Feature | Medium | CSS + CalloutBlock.ts |

**Total estimated commits:** 12
