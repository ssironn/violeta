import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { searchPluginKey, type SearchPluginState } from '../extensions/SearchHighlight'

const EMPTY_STATE: SearchPluginState = {
  active: false,
  query: '',
  matches: [],
  activeIndex: 0,
}

export function useEditorSearch(editor: Editor | null) {
  const [searchState, setSearchState] = useState<SearchPluginState>(EMPTY_STATE)

  useEffect(() => {
    if (!editor) return

    const updateState = () => {
      const state = searchPluginKey.getState(editor.state)
      if (state) setSearchState(state)
    }

    // Initial read
    updateState()

    editor.on('transaction', updateState)
    return () => {
      editor.off('transaction', updateState)
    }
  }, [editor])

  // Scroll to active match whenever it changes
  useEffect(() => {
    if (!searchState.active || searchState.matches.length === 0) return

    requestAnimationFrame(() => {
      const el = document.querySelector('.search-match-active')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }, [searchState.active, searchState.activeIndex, searchState.matches.length])

  const setQuery = useCallback((query: string) => {
    editor?.commands.setSearchQuery(query)
  }, [editor])

  const next = useCallback(() => {
    editor?.commands.nextSearchMatch()
  }, [editor])

  const prev = useCallback(() => {
    editor?.commands.prevSearchMatch()
  }, [editor])

  const close = useCallback(() => {
    editor?.commands.closeSearch()
  }, [editor])

  return { searchState, setQuery, next, prev, close }
}
