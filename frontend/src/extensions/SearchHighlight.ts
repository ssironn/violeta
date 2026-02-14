import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface SearchMatch {
  from: number
  to: number
  /** 'text' for inline text matches, 'math' for math node matches */
  type: 'text' | 'math'
}

export interface SearchPluginState {
  active: boolean
  query: string
  matches: SearchMatch[]
  activeIndex: number
}

const MATH_NODE_TYPES = new Set(['inlineMath', 'blockMath', 'mathEnvironment', 'rawLatex'])
const SKIP_NODE_TYPES = new Set(['latexSpacing'])

function getNodeLatex(node: ProseMirrorNode): string | null {
  if (node.type.name === 'inlineMath' || node.type.name === 'blockMath') {
    return node.attrs.latex as string || null
  }
  if (node.type.name === 'mathEnvironment') {
    return node.attrs.latex as string || null
  }
  if (node.type.name === 'rawLatex') {
    return node.attrs.content as string || null
  }
  return null
}

function findMatches(doc: ProseMirrorNode, query: string): SearchMatch[] {
  if (!query) return []

  const matches: SearchMatch[] = []
  const lowerQuery = query.toLowerCase()

  // When query is a LaTeX command like \phi, also match the bare name (phi)
  // so that \varphi still matches when the user clicks a \phi suggestion.
  const cmdMatch = query.match(/^\\([a-zA-Z]+)$/)
  const bareName = cmdMatch ? cmdMatch[1].toLowerCase() : null

  doc.descendants((node, pos) => {
    // Skip spacing nodes entirely
    if (SKIP_NODE_TYPES.has(node.type.name)) return false

    // Check math atom nodes
    if (MATH_NODE_TYPES.has(node.type.name)) {
      const latex = getNodeLatex(node)
      if (latex) {
        const lowerLatex = latex.toLowerCase()
        if (lowerLatex.includes(lowerQuery) || (bareName && lowerLatex.includes(bareName))) {
          matches.push({
            from: pos,
            to: pos + node.nodeSize,
            type: 'math',
          })
        }
      }
      return false // don't descend into atom nodes
    }

    // Check text nodes
    if (node.isText && node.text) {
      const text = node.text.toLowerCase()
      let index = 0
      while (true) {
        const found = text.indexOf(lowerQuery, index)
        if (found === -1) break
        matches.push({
          from: pos + found,
          to: pos + found + query.length,
          type: 'text',
        })
        index = found + 1
      }
    }

    return true
  })

  return matches
}

function buildDecorations(state: EditorState, pluginState: SearchPluginState): DecorationSet {
  if (!pluginState.active || !pluginState.query || pluginState.matches.length === 0) {
    return DecorationSet.empty
  }

  const decorations: Decoration[] = []

  pluginState.matches.forEach((match, i) => {
    const isActive = i === pluginState.activeIndex
    const className = isActive ? 'search-match search-match-active' : 'search-match'

    if (match.type === 'text') {
      decorations.push(
        Decoration.inline(match.from, match.to, { class: className })
      )
    } else {
      // Math node — use node decoration
      decorations.push(
        Decoration.node(match.from, match.to, { class: className })
      )
    }
  })

  return DecorationSet.create(state.doc, decorations)
}

export const searchPluginKey = new PluginKey<SearchPluginState>('documentSearch')

const DEFAULT_STATE: SearchPluginState = {
  active: false,
  query: '',
  matches: [],
  activeIndex: 0,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      openSearch: () => ReturnType
      closeSearch: () => ReturnType
      setSearchQuery: (query: string) => ReturnType
      nextSearchMatch: () => ReturnType
      prevSearchMatch: () => ReturnType
    }
  }
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addKeyboardShortcuts() {
    return {
      'Mod-f': () => {
        this.editor.commands.openSearch()
        return true
      },
    }
  },

  addCommands() {
    return {
      openSearch: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { action: 'open' })
          dispatch(tr)
        }
        return true
      },
      closeSearch: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { action: 'close' })
          dispatch(tr)
        }
        return true
      },
      setSearchQuery: (query: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { action: 'setQuery', query })
          dispatch(tr)
        }
        return true
      },
      nextSearchMatch: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { action: 'next' })
          dispatch(tr)
        }
        return true
      },
      prevSearchMatch: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { action: 'prev' })
          dispatch(tr)
        }
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchPluginKey,

        state: {
          init(): SearchPluginState {
            return { ...DEFAULT_STATE }
          },

          apply(tr: Transaction, prev: SearchPluginState, _oldState: EditorState, newState: EditorState): SearchPluginState {
            const meta = tr.getMeta(searchPluginKey)

            if (!meta) {
              // Doc changed — re-run search if active
              if (tr.docChanged && prev.active && prev.query) {
                const matches = findMatches(newState.doc, prev.query)
                const activeIndex = Math.min(prev.activeIndex, Math.max(0, matches.length - 1))
                return { ...prev, matches, activeIndex }
              }
              return prev
            }

            switch (meta.action) {
              case 'open':
                return { ...prev, active: true }

              case 'close':
                return { ...DEFAULT_STATE }

              case 'setQuery': {
                const query = meta.query as string
                const matches = findMatches(newState.doc, query)
                return { ...prev, query, matches, activeIndex: 0 }
              }

              case 'next': {
                if (prev.matches.length === 0) return prev
                const activeIndex = (prev.activeIndex + 1) % prev.matches.length
                return { ...prev, activeIndex }
              }

              case 'prev': {
                if (prev.matches.length === 0) return prev
                const activeIndex = (prev.activeIndex - 1 + prev.matches.length) % prev.matches.length
                return { ...prev, activeIndex }
              }

              default:
                return prev
            }
          },
        },

        props: {
          decorations(state: EditorState) {
            const pluginState = searchPluginKey.getState(state)
            if (!pluginState) return DecorationSet.empty
            return buildDecorations(state, pluginState)
          },
        },
      }),
    ]
  },
})
