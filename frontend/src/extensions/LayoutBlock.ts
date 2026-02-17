import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'

/**
 * Visual layout commands — replaces raw LaTeX blocks for spacing/page commands.
 * Renders as slim, intuitive visual indicators instead of raw LaTeX code.
 *
 * Supported commands:
 *   \vspace{...}  \vspace*{...}  \hspace{...}  \hspace*{...}
 *   \smallskip    \medskip       \bigskip
 *   \vfill        \hfill
 *   \newpage      \clearpage
 */

export type LayoutKind = 'vspace' | 'hspace' | 'skip' | 'fill' | 'pagebreak'

interface LayoutInfo {
  kind: LayoutKind
  label: string
  hint: string
  heightPx: number // visual height hint
}

/** Parse a raw LaTeX command into layout metadata */
export function parseLayoutCommand(raw: string): LayoutInfo | null {
  const trimmed = raw.trim()

  // \vspace{2cm}  or  \vspace*{1.5em}
  const vspaceMatch = trimmed.match(/^\\vspace\*?\{([^}]*)\}$/)
  if (vspaceMatch) {
    const arg = vspaceMatch[1].trim()
    return { kind: 'vspace', label: arg, hint: 'Espaço vertical', heightPx: estimateHeight(arg) }
  }

  // \hspace{...}  or  \hspace*{...}
  const hspaceMatch = trimmed.match(/^\\hspace\*?\{([^}]*)\}$/)
  if (hspaceMatch) {
    const arg = hspaceMatch[1].trim()
    return { kind: 'hspace', label: arg, hint: 'Espaço horizontal', heightPx: 24 }
  }

  // Named skip commands
  if (trimmed === '\\smallskip') return { kind: 'skip', label: '3pt', hint: 'Pulo pequeno', heightPx: 16 }
  if (trimmed === '\\medskip') return { kind: 'skip', label: '6pt', hint: 'Pulo médio', heightPx: 24 }
  if (trimmed === '\\bigskip') return { kind: 'skip', label: '12pt', hint: 'Pulo grande', heightPx: 36 }

  // Fill
  if (trimmed === '\\vfill') return { kind: 'fill', label: 'fill', hint: 'Preenchimento vertical', heightPx: 40 }
  if (trimmed === '\\hfill') return { kind: 'fill', label: 'fill', hint: 'Preenchimento horizontal', heightPx: 24 }

  // Page break
  if (trimmed === '\\newpage') return { kind: 'pagebreak', label: 'Nova página', hint: '\\newpage', heightPx: 32 }
  if (trimmed === '\\clearpage') return { kind: 'pagebreak', label: 'Nova página', hint: '\\clearpage', heightPx: 32 }

  return null
}

/** Rough height estimate from a LaTeX dimension */
function estimateHeight(dim: string): number {
  const m = dim.match(/^([\d.]+)\s*(cm|mm|in|pt|em|ex|bp|pc)$/)
  if (!m) return 28
  const val = parseFloat(m[1])
  const unit = m[2]
  // Convert to approximate px
  const pxPerUnit: Record<string, number> = {
    cm: 37.8, mm: 3.78, in: 96, pt: 1.33, em: 16, ex: 8, bp: 1.33, pc: 16,
  }
  const px = val * (pxPerUnit[unit] ?? 16)
  return Math.max(12, Math.min(px, 120)) // clamp
}

/** Check if a rawLatex content string is a layout command */
export function isLayoutCommand(content: string): boolean {
  return parseLayoutCommand(content) !== null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    layoutBlock: {
      insertLayoutBlock: (attrs: { command: string }) => ReturnType
    }
  }
}

export const LayoutBlock = Node.create({
  name: 'layoutBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      command: { default: '\\vspace{1cm}' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="layout-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'layout-block' })]
  },

  addCommands() {
    return {
      insertLayoutBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div')
      dom.classList.add('layout-block-wrapper')

      function render(n: ProseMirrorNode) {
        const cmd = (n.attrs.command ?? '') as string
        const info = parseLayoutCommand(cmd)

        dom.innerHTML = ''

        if (!info) {
          // Fallback: unknown command, show as code
          dom.classList.add('layout-block--unknown')
          const code = document.createElement('code')
          code.className = 'layout-block-fallback'
          code.textContent = cmd
          dom.appendChild(code)
          return
        }

        dom.className = 'layout-block-wrapper'
        dom.classList.add(`layout-block--${info.kind}`)
        dom.style.setProperty('--layout-height', `${info.heightPx}px`)

        if (info.kind === 'pagebreak') {
          // Page break: full-width divider
          const line = document.createElement('div')
          line.className = 'layout-block-divider'

          const tag = document.createElement('span')
          tag.className = 'layout-block-tag'
          tag.textContent = info.label
          line.appendChild(tag)

          dom.appendChild(line)
        } else {
          // Spacing: visual indicator with dashed line and label
          const spacer = document.createElement('div')
          spacer.className = 'layout-block-spacer'

          const lineLeft = document.createElement('div')
          lineLeft.className = 'layout-block-line'

          const pill = document.createElement('span')
          pill.className = 'layout-block-pill'

          // Icon + label
          const icon = document.createElement('span')
          icon.className = 'layout-block-pill-icon'
          icon.innerHTML = info.kind === 'fill' ? '&#x2195;' : '&#x2195;' // ↕

          const text = document.createElement('span')
          text.textContent = info.label

          pill.appendChild(icon)
          pill.appendChild(text)

          const lineRight = document.createElement('div')
          lineRight.className = 'layout-block-line'

          spacer.appendChild(lineLeft)
          spacer.appendChild(pill)
          spacer.appendChild(lineRight)

          dom.appendChild(spacer)
        }

        // Tooltip on hover
        dom.title = `${info.hint} (${cmd})`
      }

      render(node)

      // Click to select
      dom.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const pos = getPos()
        if (pos != null) {
          const tr = editor.view.state.tr
          const selection = NodeSelection.create(editor.view.state.doc, pos)
          editor.view.dispatch(tr.setSelection(selection))
        }
      })

      return {
        dom,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'layoutBlock') return false
          render(updatedNode)
          return true
        },

        selectNode() {
          dom.classList.add('layout-block--selected')
        },

        deselectNode() {
          dom.classList.remove('layout-block--selected')
        },

        stopEvent() {
          return false
        },

        ignoreMutation() {
          return true
        },

        destroy() {},
      }
    }
  },
})
