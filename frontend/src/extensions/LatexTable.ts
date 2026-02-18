import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    latexTable: {
      insertLatexTable: (attrs?: { cols?: number; rows?: number }) => ReturnType
    }
  }
}

function makeEmptyRow(cols: number): string[] {
  return Array.from({ length: cols }, () => '')
}

export const LatexTable = Node.create({
  name: 'latexTable',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      headers: { default: ['', '', ''] },
      rows: { default: [['', '', '']] },
      caption: { default: '' },
      columnSpec: { default: '' },
      ruleStyle: { default: 'hline' },
      textAlign: {
        default: 'left',
        renderHTML: (attributes: Record<string, unknown>) => {
          return { style: `text-align: ${attributes.textAlign}` }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="latex-table"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'latex-table' })]
  },

  addCommands() {
    return {
      insertLatexTable:
        (attrs) =>
        ({ commands }) => {
          const cols = attrs?.cols ?? 3
          const rows = attrs?.rows ?? 2
          return commands.insertContent({
            type: this.name,
            attrs: {
              headers: makeEmptyRow(cols),
              rows: Array.from({ length: rows }, () => makeEmptyRow(cols)),
              caption: '',
            },
          })
        },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentAttrs = { ...node.attrs } as {
        headers: string[]
        rows: string[][]
        caption: string
      }

      const dom = document.createElement('div')
      dom.classList.add('block-card-wrapper')

      const card = document.createElement('div')
      card.classList.add('latex-table-block')
      dom.appendChild(card)

      // Header
      const header = document.createElement('div')
      header.classList.add('latex-table-header')
      header.textContent = 'Tabela'
      card.appendChild(header)

      // Table container
      const tableContainer = document.createElement('div')
      tableContainer.classList.add('latex-table-container')
      card.appendChild(tableContainer)

      // Actions bar
      const actions = document.createElement('div')
      actions.classList.add('latex-table-actions')
      card.appendChild(actions)

      // Caption input
      const captionWrap = document.createElement('div')
      captionWrap.classList.add('latex-table-caption-wrap')
      const captionLabel = document.createElement('span')
      captionLabel.classList.add('latex-table-caption-label')
      captionLabel.textContent = 'Legenda:'
      captionWrap.appendChild(captionLabel)
      const captionInput = document.createElement('input')
      captionInput.classList.add('latex-table-caption-input')
      captionInput.type = 'text'
      captionInput.placeholder = 'Legenda da tabela (opcional)'
      captionInput.value = currentAttrs.caption
      captionWrap.appendChild(captionInput)
      card.appendChild(captionWrap)

      function applyAlignment(n: ProseMirrorNode) {
        const align = (n.attrs.textAlign as string) || 'left'
        dom.style.textAlign = align
      }

      function dispatchUpdate() {
        const pos = getPos()
        if (pos != null) {
          const currentNode = editor.view.state.doc.nodeAt(pos)
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              headers: currentAttrs.headers.map((h) => h),
              rows: currentAttrs.rows.map((r) => r.map((c) => c)),
              caption: currentAttrs.caption,
              textAlign: currentNode?.attrs.textAlign ?? 'left',
              columnSpec: currentNode?.attrs.columnSpec ?? '',
              ruleStyle: currentNode?.attrs.ruleStyle ?? 'hline',
            }),
          )
        }
      }

      function renderTable() {
        tableContainer.innerHTML = ''
        const table = document.createElement('table')
        table.classList.add('latex-table')

        // Header row
        const thead = document.createElement('thead')
        const headRow = document.createElement('tr')
        currentAttrs.headers.forEach((h, ci) => {
          const th = document.createElement('th')
          th.contentEditable = 'true'
          th.textContent = h
          th.addEventListener('input', () => {
            currentAttrs.headers[ci] = th.textContent ?? ''
            dispatchUpdate()
          })
          th.addEventListener('mousedown', (e) => e.stopPropagation())
          th.addEventListener('keydown', (e) => e.stopPropagation())
          headRow.appendChild(th)
        })
        // Empty th for delete-col buttons
        const thEmpty = document.createElement('th')
        thEmpty.classList.add('latex-table-col-actions')
        currentAttrs.headers.forEach((_, ci) => {
          const btn = document.createElement('button')
          btn.textContent = '×'
          btn.title = 'Remover coluna'
          btn.classList.add('latex-table-remove-btn')
          btn.addEventListener('mousedown', (e) => e.stopPropagation())
          btn.addEventListener('click', () => {
            if (currentAttrs.headers.length <= 1) return
            currentAttrs.headers.splice(ci, 1)
            currentAttrs.rows.forEach((r) => r.splice(ci, 1))
            dispatchUpdate()
            renderTable()
          })
          thEmpty.appendChild(btn)
        })
        headRow.appendChild(thEmpty)
        thead.appendChild(headRow)
        table.appendChild(thead)

        // Body rows
        const tbody = document.createElement('tbody')
        currentAttrs.rows.forEach((row, ri) => {
          const tr = document.createElement('tr')
          row.forEach((cell, ci) => {
            const td = document.createElement('td')
            td.contentEditable = 'true'
            td.textContent = cell
            td.addEventListener('input', () => {
              currentAttrs.rows[ri][ci] = td.textContent ?? ''
              dispatchUpdate()
            })
            td.addEventListener('mousedown', (e) => e.stopPropagation())
            td.addEventListener('keydown', (e) => e.stopPropagation())
            tr.appendChild(td)
          })
          // Delete row button
          const tdAction = document.createElement('td')
          tdAction.classList.add('latex-table-row-action')
          const delBtn = document.createElement('button')
          delBtn.textContent = '×'
          delBtn.title = 'Remover linha'
          delBtn.classList.add('latex-table-remove-btn')
          delBtn.addEventListener('mousedown', (e) => e.stopPropagation())
          delBtn.addEventListener('click', () => {
            if (currentAttrs.rows.length <= 1) return
            currentAttrs.rows.splice(ri, 1)
            dispatchUpdate()
            renderTable()
          })
          tdAction.appendChild(delBtn)
          tr.appendChild(tdAction)
          tbody.appendChild(tr)
        })
        table.appendChild(tbody)
        tableContainer.appendChild(table)

        // Render action buttons
        renderActions()
      }

      function renderActions() {
        actions.innerHTML = ''
        const addRow = document.createElement('button')
        addRow.classList.add('latex-table-action-btn')
        addRow.textContent = '+ Linha'
        addRow.addEventListener('mousedown', (e) => e.stopPropagation())
        addRow.addEventListener('click', () => {
          currentAttrs.rows.push(makeEmptyRow(currentAttrs.headers.length))
          dispatchUpdate()
          renderTable()
        })
        actions.appendChild(addRow)

        const addCol = document.createElement('button')
        addCol.classList.add('latex-table-action-btn')
        addCol.textContent = '+ Coluna'
        addCol.addEventListener('mousedown', (e) => e.stopPropagation())
        addCol.addEventListener('click', () => {
          currentAttrs.headers.push('')
          currentAttrs.rows.forEach((r) => r.push(''))
          dispatchUpdate()
          renderTable()
        })
        actions.appendChild(addCol)
      }

      captionInput.addEventListener('mousedown', (e) => e.stopPropagation())
      captionInput.addEventListener('input', () => {
        currentAttrs.caption = captionInput.value
        dispatchUpdate()
      })

      renderTable()
      applyAlignment(node)

      return {
        dom,

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'latexTable') return false
          applyAlignment(updatedNode)
          currentAttrs = {
            headers: [...(updatedNode.attrs.headers as string[])],
            rows: (updatedNode.attrs.rows as string[][]).map((r) => [...r]),
            caption: updatedNode.attrs.caption as string,
          }
          if (captionInput.value !== currentAttrs.caption) {
            captionInput.value = currentAttrs.caption
          }
          // Only re-render table if not actively editing a cell
          if (!tableContainer.contains(document.activeElement)) {
            renderTable()
          }
          return true
        },

        selectNode() {
          card.classList.add('selected')
        },

        deselectNode() {
          card.classList.remove('selected')
        },

        stopEvent(event: Event) {
          return card.contains(event.target as HTMLElement)
        },

        ignoreMutation() {
          return true
        },

        destroy() {},
      }
    }
  },
})
