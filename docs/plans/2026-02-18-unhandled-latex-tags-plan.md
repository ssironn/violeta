# Tratamento de Tags LaTeX Não-Tratadas — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Melhorar o parser/gerador LaTeX para tratar `\chapter`, `\part`, comandos de conteúdo como `\title`/`\author`, e melhorar a renderização visual de blocos rawLatex restantes.

**Architecture:** Três camadas: (1) Expandir headings para incluir `\chapter`/`\part` com round-trip via `sourceCommand` attr, (2) Nova categoria `CONTENT_DISPLAY_COMMANDS` que extrai conteúdo com mark de round-trip, (3) Renderização visual inteligente do `RawLatexBlock` com label dinâmico e detecção de tipo.

**Tech Stack:** TypeScript, TipTap/ProseMirror, Vite, Vitest (novo), KaTeX

---

### Task 1: Setup Vitest

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`

**Step 1: Install vitest**

Run: `cd frontend && npm install -D vitest`

**Step 2: Create vitest config**

Create `frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
```

**Step 3: Add test script to package.json**

Add to scripts: `"test": "vitest run"`

**Step 4: Verify vitest runs**

Run: `cd frontend && npx vitest run`
Expected: No tests found (0 tests), clean exit

**Step 5: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/package-lock.json
git commit -m "chore: setup vitest for unit testing"
```

---

### Task 2: Tests para `\chapter`/`\part` no parser

**Files:**
- Create: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Step 1: Write failing tests**

Create `frontend/src/latex/__tests__/parseLatex.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseLatex } from '../parseLatex'

describe('parseLatex — chapter/part headings', () => {
  it('parses \\chapter{Title} as heading level 0', () => {
    const doc = parseLatex('\\chapter{Introduction}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.attrs?.sourceCommand).toBe('chapter')
    expect(heading.content![0].text).toBe('Introduction')
  })

  it('parses \\chapter*{Title} as starred heading level 0', () => {
    const doc = parseLatex('\\chapter*{No Number}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.attrs?.starred).toBe(true)
    expect(heading.attrs?.sourceCommand).toBe('chapter')
  })

  it('parses \\part{Title} as heading level 0 with sourceCommand=part', () => {
    const doc = parseLatex('\\part{First Part}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.attrs?.sourceCommand).toBe('part')
    expect(heading.content![0].text).toBe('First Part')
  })

  it('preserves existing \\section behavior unchanged', () => {
    const doc = parseLatex('\\section{Hello}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(1)
  })

  it('handles \\chapter with inline formatting', () => {
    const doc = parseLatex('\\chapter{\\textbf{Bold} Title}')
    const heading = doc.content![0]
    expect(heading.type).toBe('heading')
    expect(heading.attrs?.level).toBe(0)
    expect(heading.content!.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts`
Expected: FAIL — chapter is not recognized as heading

---

### Task 3: Implementar `\chapter`/`\part` no parser

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts:639-647` (parseBlock heading match)
- Modify: `frontend/src/latex/parseLatex.ts:959` (splitIntoBlocks heading regex)

**Step 1: Expand heading regex in parseBlock (line ~639)**

Change:
```ts
const headingMatch = trimmed.match(/^\\(section|subsection|subsubsection|paragraph)(\*?)\{/)
```
To:
```ts
const headingMatch = trimmed.match(/^\\(part|chapter|section|subsection|subsubsection|paragraph)(\*?)\{/)
```

**Step 2: Update levels map and add sourceCommand (lines ~643-647)**

Change:
```ts
const levels: Record<string, number> = { section: 1, subsection: 2, subsubsection: 3, paragraph: 4 }
const level = levels[cmd] ?? 1
const group = extractBraceGroup(trimmed, headingMatch[0].length - 1)
const content = parseInline(group.content)
return content.length > 0 ? [{ type: 'heading', attrs: { level, starred }, content }] : []
```
To:
```ts
const levels: Record<string, number> = { part: 0, chapter: 0, section: 1, subsection: 2, subsubsection: 3, paragraph: 4 }
const level = levels[cmd] ?? 1
const group = extractBraceGroup(trimmed, headingMatch[0].length - 1)
const content = parseInline(group.content)
const attrs: Record<string, any> = { level, starred }
if (cmd === 'part' || cmd === 'chapter') attrs.sourceCommand = cmd
return content.length > 0 ? [{ type: 'heading', attrs, content }] : []
```

**Step 3: Expand splitIntoBlocks heading regex (line ~959)**

Change:
```ts
if (/^\\(section|subsection|subsubsection|paragraph)\*?\{/.test(trimmedLine)) {
```
To:
```ts
if (/^\\(part|chapter|section|subsection|subsubsection|paragraph)\*?\{/.test(trimmedLine)) {
```

**Step 4: Run tests**

Run: `cd frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "feat: parse \\chapter and \\part as heading level 0"
```

---

### Task 4: Tests para round-trip de `\chapter`/`\part` no gerador

**Files:**
- Create: `frontend/src/latex/__tests__/generateLatex.test.ts`

**Step 1: Write failing tests**

Create `frontend/src/latex/__tests__/generateLatex.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateLatex } from '../generateLatex'

describe('generateLatex — chapter/part round-trip', () => {
  it('generates \\chapter from heading level 0 with sourceCommand=chapter', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: false, sourceCommand: 'chapter' },
        content: [{ type: 'text', text: 'Introduction' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\chapter{Introduction}')
  })

  it('generates \\chapter* for starred heading', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: true, sourceCommand: 'chapter' },
        content: [{ type: 'text', text: 'No Number' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\chapter*{No Number}')
  })

  it('generates \\part from heading level 0 with sourceCommand=part', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: false, sourceCommand: 'part' },
        content: [{ type: 'text', text: 'First Part' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\part{First Part}')
  })

  it('defaults level 0 without sourceCommand to \\chapter', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 0, starred: false },
        content: [{ type: 'text', text: 'Default' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\chapter{Default}')
  })

  it('preserves \\section for level 1 unchanged', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 1, starred: false },
        content: [{ type: 'text', text: 'Section' }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\section{Section}')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/latex/__tests__/generateLatex.test.ts`
Expected: FAIL — level 0 not handled

---

### Task 5: Implementar round-trip de `\chapter`/`\part` no gerador

**Files:**
- Modify: `frontend/src/latex/generateLatex.ts:146-153` (processNode heading case)

**Step 1: Update heading generation**

Change:
```ts
case 'heading': {
  const level = node.attrs?.level ?? 1
  const starred = node.attrs?.starred ? '*' : ''
  const text = processInlineContent(node, true)
  const commands = ['\\section', '\\subsection', '\\subsubsection', '\\paragraph']
  const cmd = commands[Math.min(level - 1, commands.length - 1)]
  return `${cmd}${starred}{${text}}`
}
```
To:
```ts
case 'heading': {
  const level = node.attrs?.level ?? 1
  const starred = node.attrs?.starred ? '*' : ''
  const text = processInlineContent(node, true)
  if (level === 0) {
    const src = (node.attrs?.sourceCommand as string) || 'chapter'
    return `\\${src}${starred}{${text}}`
  }
  const commands = ['\\section', '\\subsection', '\\subsubsection', '\\paragraph']
  const cmd = commands[Math.min(level - 1, commands.length - 1)]
  return `${cmd}${starred}{${text}}`
}
```

**Step 2: Run tests**

Run: `cd frontend && npx vitest run src/latex/__tests__/generateLatex.test.ts`
Expected: ALL PASS

**Step 3: Run all tests to verify no regressions**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add frontend/src/latex/generateLatex.ts frontend/src/latex/__tests__/generateLatex.test.ts
git commit -m "feat: generate \\chapter/\\part from heading level 0 (round-trip)"
```

---

### Task 6: Tests para CONTENT_DISPLAY_COMMANDS

**Files:**
- Modify: `frontend/src/latex/__tests__/parseLatex.test.ts`

**Step 1: Add failing tests**

Append to `parseLatex.test.ts`:
```ts
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
    // Should contain "Hello ", then "Small Caps" with sourceCommand mark, then " world"
    const scNode = para.content!.find((n: any) =>
      n.marks?.some((m: any) => m.type === 'sourceCommand')
    )
    expect(scNode).toBeDefined()
    expect(scNode!.text).toBe('Small Caps')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts`
Expected: FAIL — these commands fall through to rawLatex

---

### Task 7: Implementar CONTENT_DISPLAY_COMMANDS no parser

**Files:**
- Modify: `frontend/src/latex/parseLatex.ts` (parseInline function, after FONT_COMMANDS block ~284-298)

**Step 1: Add CONTENT_DISPLAY_COMMANDS set**

After `FONT_COMMANDS` set (line ~80), add:
```ts
// Commands whose {content} should be displayed with a sourceCommand mark for round-trip
const CONTENT_DISPLAY_COMMANDS = new Set([
  'title', 'author', 'date', 'thanks',
  'textsc',
])
```

**Step 2: Add handler in parseInline, after FONT_COMMANDS block (after line ~298)**

Insert after the FONT_COMMANDS handler:
```ts
// Content display commands — extract {content} with sourceCommand mark for round-trip
if (CONTENT_DISPLAY_COMMANDS.has(cmd)) {
  if (text[afterCmd] === '{') {
    const group = extractBraceGroup(text, afterCmd)
    const inner = parseInline(group.content)
    const marked = addMarkToNodes(inner, { type: 'sourceCommand', attrs: { command: cmd } })
    nodes.push(...marked)
    i = group.end
  } else {
    i = afterCmd
  }
  continue
}
```

**Step 3: Run tests**

Run: `cd frontend && npx vitest run src/latex/__tests__/parseLatex.test.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add frontend/src/latex/parseLatex.ts frontend/src/latex/__tests__/parseLatex.test.ts
git commit -m "feat: extract content from \\title, \\author, \\textsc with sourceCommand mark"
```

---

### Task 8: Tests para round-trip de CONTENT_DISPLAY_COMMANDS no gerador

**Files:**
- Modify: `frontend/src/latex/__tests__/generateLatex.test.ts`

**Step 1: Add failing tests**

Append to `generateLatex.test.ts`:
```ts
describe('generateLatex — CONTENT_DISPLAY_COMMANDS round-trip', () => {
  it('wraps text with sourceCommand mark back in \\title{}', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'My Document',
          marks: [{ type: 'sourceCommand', attrs: { command: 'title' } }],
        }],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('\\title{My Document}')
  })

  it('wraps text with sourceCommand mark back in \\textsc{}', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello ' },
          {
            type: 'text',
            text: 'Small Caps',
            marks: [{ type: 'sourceCommand', attrs: { command: 'textsc' } }],
          },
          { type: 'text', text: ' world' },
        ],
      }],
    }
    const latex = generateLatex(doc)
    expect(latex).toContain('Hello \\textsc{Small Caps} world')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/latex/__tests__/generateLatex.test.ts`
Expected: FAIL — sourceCommand mark not handled

---

### Task 9: Implementar round-trip de sourceCommand no gerador

**Files:**
- Modify: `frontend/src/latex/generateLatex.ts:64-93` (processMarks function)

**Step 1: Add sourceCommand case in processMarks**

In the `switch (mark.type)` block inside `processMarks`, add before the `default`:
```ts
case 'sourceCommand':
  result = `\\${mark.attrs?.command ?? ''}{${result}}`
  break
```

**Step 2: Run tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add frontend/src/latex/generateLatex.ts frontend/src/latex/__tests__/generateLatex.test.ts
git commit -m "feat: round-trip sourceCommand mark in LaTeX generation"
```

---

### Task 10: Melhorar renderização visual do RawLatexBlock

**Files:**
- Modify: `frontend/src/extensions/RawLatexBlock.ts:62-128` (addNodeView)

**Step 1: Add helper function to detect content type and extract command name**

Inside `addNodeView`, before `renderPreview`, add:
```ts
function detectContentType(latex: string): { type: 'math' | 'command' | 'other'; commandName?: string; args?: string } {
  const trimmed = latex.trim()
  // Math delimiters
  if (trimmed.startsWith('$$') || trimmed.startsWith('\\[') || trimmed.startsWith('$') ||
      trimmed.startsWith('\\(') || trimmed.startsWith('\\begin{')) {
    return { type: 'math' }
  }
  // Command with args: \commandname{...} or \commandname[...]{...}
  const cmdMatch = trimmed.match(/^\\([a-zA-Z]+)(?:\[[^\]]*\])?\{/)
  if (cmdMatch) {
    const commandName = cmdMatch[1]
    // Extract first brace group content for preview
    const openBrace = trimmed.indexOf('{')
    if (openBrace !== -1) {
      let depth = 0
      let end = openBrace
      for (let i = openBrace; i < trimmed.length; i++) {
        if (trimmed[i] === '{') depth++
        if (trimmed[i] === '}') depth--
        if (depth === 0) { end = i; break }
      }
      const args = trimmed.slice(openBrace + 1, end)
      return { type: 'command', commandName, args }
    }
    return { type: 'command', commandName }
  }
  return { type: 'other' }
}
```

**Step 2: Update renderPreview to use content type detection**

Replace the existing `renderPreview` function with:
```ts
function renderPreview(latex: string) {
  if (!latex.trim()) {
    preview.innerHTML = '<span class="raw-latex-placeholder">Digite LaTeX aqui...</span>'
    return
  }

  const info = detectContentType(latex)

  if (info.type === 'math') {
    try {
      const { math, displayMode } = stripMathDelimiters(latex)
      preview.innerHTML = katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        macros: { ...katexMacros },
        errorColor: '#7a6299',
      })
    } catch {
      preview.textContent = latex
    }
    return
  }

  if (info.type === 'command' && info.commandName) {
    // Show command name as styled label + readable content
    const cmdSpan = document.createElement('span')
    cmdSpan.className = 'raw-latex-cmd-name'
    cmdSpan.textContent = '\\' + info.commandName
    const contentSpan = document.createElement('span')
    contentSpan.className = 'raw-latex-cmd-content'
    contentSpan.textContent = info.args ?? ''
    preview.innerHTML = ''
    preview.appendChild(cmdSpan)
    if (info.args) {
      preview.appendChild(contentSpan)
    }
    return
  }

  // Fallback: monospace
  preview.textContent = latex
}
```

**Step 3: Update dynamic label**

Replace:
```ts
label.textContent = 'LaTeX'
```
With:
```ts
function updateLabel(latex: string) {
  const info = detectContentType(latex)
  if (info.type === 'command' && info.commandName) {
    label.textContent = info.commandName
  } else if (info.type === 'math') {
    label.textContent = 'Math'
  } else {
    label.textContent = 'LaTeX'
  }
}
updateLabel(node.attrs.content as string)
```

Also add `updateLabel(value)` in the textarea input handler and `updateLabel(newContent)` in the `update()` method.

**Step 4: Verify visually**

Run: `cd frontend && npm run dev`
Import a .tex with `\hypersetup{...}` or other unknown commands. Verify:
- Label shows command name instead of "LaTeX"
- Preview shows readable content instead of KaTeX error

**Step 5: Commit**

```bash
git add frontend/src/extensions/RawLatexBlock.ts
git commit -m "feat: smart rendering for rawLatex blocks with dynamic labels"
```

---

### Task 11: CSS para heading nível 0 e rawLatex command preview

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: Add heading level 0 styles**

If the editor uses heading levels mapped to h1-h4, add a rule for level 0 (will likely need `h1` or a custom class). Check how headings are rendered in the TipTap heading extension.

Add styles:
```css
.raw-latex-cmd-name {
  font-family: monospace;
  font-size: 0.75em;
  color: #7a6299;
  background: rgba(122, 98, 153, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  margin-right: 6px;
}

.raw-latex-cmd-content {
  color: #d4d4d8;
}
```

**Step 2: Verify visually**

Run: `cd frontend && npm run dev`

**Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: add CSS for rawLatex command preview and heading level 0"
```

---

### Task 12: Integration test — full round-trip

**Files:**
- Create: `frontend/src/latex/__tests__/roundtrip.test.ts`

**Step 1: Write round-trip test**

```ts
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

  it('round-trips \\section unchanged', () => {
    const input = '\\section{Hello}'
    const doc = parseLatex(input)
    const output = generateLatex(doc)
    expect(output).toContain('\\section{Hello}')
  })
})
```

**Step 2: Run all tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add frontend/src/latex/__tests__/roundtrip.test.ts
git commit -m "test: add round-trip integration tests for chapter/part/title"
```
