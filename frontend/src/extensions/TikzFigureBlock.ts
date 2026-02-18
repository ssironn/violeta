import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { renderTikzSvg } from '../tikz/renderTikzSvg'
import type { TikzShape } from '../tikz/types'

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
      textAlign: {
        default: 'left',
        renderHTML: (attributes: Record<string, unknown>) => {
          return { style: `text-align: ${attributes.textAlign}` }
        },
      },
      label: { default: '' },
      starred: { default: false },
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
      dom.classList.add('block-card-wrapper')

      const card = document.createElement('div')
      card.classList.add(
        'tikz-figure-block',
        'relative',
        'border',
        'border-gray-300',
        'rounded-lg',
        'p-4',
        'cursor-pointer',
        'hover:border-purple-400',
        'transition-colors',
      )
      dom.appendChild(card)

      const label = document.createElement('div')
      label.classList.add('block-card-label', 'text-xs', 'font-semibold', 'text-purple-600', 'mb-2')
      label.textContent = 'Figuras Geom\u00e9tricas'
      card.appendChild(label)

      const previewContainer = document.createElement('div')
      previewContainer.style.display = 'flex'
      previewContainer.style.justifyContent = 'center'
      card.appendChild(previewContainer)

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
      card.appendChild(hoverHint)

      function applyAlignment(n: ProseMirrorNode) {
        const align = (n.attrs.textAlign as string) || 'left'
        dom.style.textAlign = align
      }

      function renderPreview(n: ProseMirrorNode) {
        const shapes = (n.attrs.shapes as TikzShape[]) || []
        applyAlignment(n)

        if (shapes.length === 0) {
          previewContainer.innerHTML = ''
          previewContainer.textContent = '(vazio)'
          previewContainer.style.color = '#9ca3af'
          previewContainer.style.fontSize = '0.875rem'
          previewContainer.style.padding = '1rem 0'
          return
        }

        previewContainer.style.color = ''
        previewContainer.style.fontSize = ''
        previewContainer.style.padding = ''
        renderTikzSvg(previewContainer, shapes, 400, 280)
      }

      renderPreview(node)

      card.addEventListener('click', () => {
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
          renderPreview(updatedNode)
          return true
        },

        selectNode() {
          card.classList.add('ring-2', 'ring-purple-400')
        },

        deselectNode() {
          card.classList.remove('ring-2', 'ring-purple-400')
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
