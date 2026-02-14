import type { Editor } from '@tiptap/core'

export function insertLink(editor: Editor) {
  const href = window.prompt('URL do link:')
  if (!href) return

  const { from, to } = editor.state.selection
  const hasSelection = from !== to

  if (hasSelection) {
    editor.chain().focus().setLink({ href }).run()
  } else {
    const text = window.prompt('Texto do link:') ?? href
    editor
      .chain()
      .focus()
      .insertContent(`<a href="${href}">${text}</a>`)
      .run()
  }
}
