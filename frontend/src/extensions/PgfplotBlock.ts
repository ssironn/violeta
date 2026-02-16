import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { renderPlotSvg } from '../pgfplots/renderPlotSvg'
import type { PgfplotConfig } from '../pgfplots/types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pgfplotBlock: {
      insertPgfplot: (attrs?: { pgfCode?: string; plotConfig?: unknown }) => ReturnType
      updatePgfplot: (opts: { pgfCode?: string; plotConfig?: unknown; pos: number }) => ReturnType
      deletePgfplot: (opts: { pos: number }) => ReturnType
    }
  }
}

export const PgfplotBlock = Node.create({
  name: 'pgfplotBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      pgfCode: {
        default: '',
      },
      plotConfig: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const val = element.getAttribute('data-plot-config')
          return val ? JSON.parse(val) : null
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          return { 'data-plot-config': JSON.stringify(attributes.plotConfig) }
        },
      },
      textAlign: {
        default: 'left',
        renderHTML: (attributes: Record<string, unknown>) => {
          return { style: `text-align: ${attributes.textAlign}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pgfplot-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'pgfplot-block' })]
  },

  addCommands() {
    return {
      insertPgfplot:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              pgfCode: attrs?.pgfCode ?? '',
              plotConfig: attrs?.plotConfig ?? null,
            },
          })
        },

      updatePgfplot:
        ({ pgfCode, plotConfig, pos }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const node = tr.doc.nodeAt(pos)
            if (!node || node.type.name !== this.name) return false
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              ...(pgfCode !== undefined ? { pgfCode } : {}),
              ...(plotConfig !== undefined ? { plotConfig } : {}),
            })
          }
          return true
        },

      deletePgfplot:
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
        'pgfplot-block',
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
      label.textContent = 'Gr\u00e1fico de Fun\u00e7\u00f5es'
      dom.appendChild(label)

      const previewContainer = document.createElement('div')
      previewContainer.style.display = 'flex'
      previewContainer.style.justifyContent = 'center'
      dom.appendChild(previewContainer)

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

      function applyAlignment(n: ProseMirrorNode) {
        const align = (n.attrs.textAlign as string) || 'left'
        dom.style.textAlign = align
      }

      function renderPreview(n: ProseMirrorNode) {
        const config = n.attrs.plotConfig as PgfplotConfig | null
        applyAlignment(n)

        if (!config || !config.plots || config.plots.length === 0) {
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
        renderPlotSvg(previewContainer, config, 400, 280)
      }

      renderPreview(node)

      dom.addEventListener('click', () => {
        const pos = getPos()
        if (pos == null) return
        window.dispatchEvent(
          new CustomEvent('pgfplot-block-click', {
            detail: {
              plotConfig: node.attrs.plotConfig,
              pgfCode: node.attrs.pgfCode,
              pos,
            },
          }),
        )
      })

      return {
        dom,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'pgfplotBlock') {
            return false
          }
          node = updatedNode
          renderPreview(updatedNode)
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
