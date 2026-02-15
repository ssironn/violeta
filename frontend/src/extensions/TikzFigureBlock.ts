import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tikzFigure: {
      insertTikzFigure: (attrs?: { tikzCode?: string; shapes?: unknown[] }) => ReturnType
      updateTikzFigure: (opts: { tikzCode?: string; shapes?: unknown[]; pos: number }) => ReturnType
      deleteTikzFigure: (opts: { pos: number }) => ReturnType
    }
  }
}

export const TikzFigureBlock = Node.create({
  name: 'tikzFigure',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      tikzCode: {
        default: '',
      },
      shapes: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const val = element.getAttribute('data-shapes')
          return val ? JSON.parse(val) : []
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          return { 'data-shapes': JSON.stringify(attributes.shapes) }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="tikz-figure"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tikz-figure' })]
  },

  addCommands() {
    return {
      insertTikzFigure:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              tikzCode: attrs?.tikzCode ?? '',
              shapes: attrs?.shapes ?? [],
            },
          })
        },

      updateTikzFigure:
        ({ tikzCode, shapes, pos }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const node = tr.doc.nodeAt(pos)
            if (!node || node.type.name !== this.name) return false
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              ...(tikzCode !== undefined ? { tikzCode } : {}),
              ...(shapes !== undefined ? { shapes } : {}),
            })
          }
          return true
        },

      deleteTikzFigure:
        ({ pos }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const node = tr.doc.nodeAt(pos)
            if (!node || node.type.name !== this.name) return false
            tr.delete(pos, pos + node.nodeSize)
          }
          return true
        },
    }
  },

  addNodeView() {
    return ({ node, getPos }) => {
      const dom = document.createElement('div')
      dom.classList.add(
        'tikz-figure-block',
        'relative',
        'my-4',
        'border',
        'border-gray-300',
        'rounded-lg',
        'p-4',
        'cursor-pointer',
        'hover:border-purple-400',
        'transition-colors',
      )

      const label = document.createElement('div')
      label.classList.add('text-xs', 'font-semibold', 'text-purple-600', 'mb-2')
      label.textContent = 'Figura TikZ'
      dom.appendChild(label)

      const pre = document.createElement('pre')
      pre.classList.add(
        'text-sm',
        'text-gray-600',
        'whitespace-pre-wrap',
        'max-h-32',
        'overflow-hidden',
        'font-mono',
      )
      dom.appendChild(pre)

      const hoverHint = document.createElement('div')
      hoverHint.classList.add(
        'absolute',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-white/80',
        'text-purple-600',
        'font-medium',
        'opacity-0',
        'hover:opacity-100',
        'transition-opacity',
        'rounded-lg',
      )
      hoverHint.textContent = 'Clique para editar'
      dom.appendChild(hoverHint)

      function renderContent(n: ProseMirrorNode) {
        const code = n.attrs.tikzCode as string
        pre.textContent = code || '(vazio)'
      }

      renderContent(node)

      dom.addEventListener('click', () => {
        const pos = getPos()
        if (pos == null) return
        window.dispatchEvent(
          new CustomEvent('tikz-figure-click', {
            detail: {
              shapes: node.attrs.shapes,
              tikzCode: node.attrs.tikzCode,
              pos,
            },
          }),
        )
      })

      return {
        dom,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'tikzFigure') {
            return false
          }
          node = updatedNode
          renderContent(updatedNode)
          return true
        },

        selectNode() {
          dom.classList.add('ring-2', 'ring-purple-400')
        },

        deselectNode() {
          dom.classList.remove('ring-2', 'ring-purple-400')
        },

        stopEvent() {
          return false
        },

        ignoreMutation() {
          return true
        },

        destroy() {
          // Nothing to clean up
        },
      }
    }
  },
})
