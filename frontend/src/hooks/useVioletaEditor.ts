import { useEditor } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Mathematics } from '@tiptap/extension-mathematics'
import { katexMacros } from '../latex/katexMacros'
import { RawLatexBlock } from '../extensions/RawLatexBlock'
import { MathEnvironment } from '../extensions/MathEnvironment'
import { LatexTable } from '../extensions/LatexTable'
import { CalloutBlock } from '../extensions/CalloutBlock'
import { SlashCommands } from '../extensions/SlashCommands'
import { LatexSpacing } from '../extensions/LatexSpacing'
import { BlockInsertButton } from '../extensions/BlockInsertButton'
import { SearchHighlight } from '../extensions/SearchHighlight'
import { TikzFigureBlock } from '../extensions/TikzFigureBlock'
import { PgfplotBlock } from '../extensions/PgfplotBlock'

export interface MathEditState {
  latex: string
  pos: number
  type: 'inlineMath' | 'blockMath'
  /** 'edit' = updating existing node, 'insert' = creating a new node */
  mode: 'edit' | 'insert'
}

interface UseVioletaEditorOptions {
  onMathClick: (state: MathEditState) => void
}

export function useVioletaEditor({ onMathClick }: UseVioletaEditorOptions) {
  const handleMathClick = (type: MathEditState['type']) => (node: ProseMirrorNode, pos: number) => {
    onMathClick({
      latex: node.attrs.latex,
      pos,
      type,
      mode: 'edit',
    })
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'tikzFigure', 'pgfplotBlock', 'rawLatex', 'latexTable', 'mathEnvironment', 'calloutBlock'],
      }),
      TextStyle,
      Color,
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            assetFilename: { default: null },
          }
        },
      }).configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: 'Comece a escrever seu documento...',
      }),
      Mathematics.configure({
        katexOptions: {
          macros: katexMacros,
          throwOnError: false,
          errorColor: '#7a6299',
        },
        inlineOptions: {
          onClick: handleMathClick('inlineMath'),
        },
        blockOptions: {
          onClick: handleMathClick('blockMath'),
        },
      }),
      RawLatexBlock,
      MathEnvironment,
      LatexTable,
      CalloutBlock,
      SlashCommands,
      LatexSpacing,
      BlockInsertButton,
      SearchHighlight,
      TikzFigureBlock,
      PgfplotBlock,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
  })

  return editor
}
