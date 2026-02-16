import { useEffect, useState, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  GripVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
} from 'lucide-react'
import { getAllCalloutTypes } from '../../extensions/CalloutBlock'

interface Props {
  editor: Editor
}

interface BlockInfo {
  node: ProseMirrorNode
  pos: number
  domTop: number
  index: number
}

/** Human-readable block type labels (Portuguese) */
function getBlockLabel(node: ProseMirrorNode): string {
  switch (node.type.name) {
    case 'paragraph':
      return 'Parágrafo'
    case 'heading': {
      const level = node.attrs.level as number
      if (level === 1) return 'Título 1'
      if (level === 2) return 'Título 2'
      if (level === 3) return 'Título 3'
      return `Título ${level}`
    }
    case 'bulletList':
      return 'Lista'
    case 'orderedList':
      return 'Lista numerada'
    case 'blockquote':
      return 'Citação'
    case 'codeBlock':
      return 'Código'
    case 'inlineMath':
    case 'blockMath':
      return 'Equação'
    case 'image':
      return 'Imagem'
    case 'horizontalRule':
      return 'Linha horizontal'
    case 'mathEnvironment': {
      const env = node.attrs.environment as string
      return env.charAt(0).toUpperCase() + env.slice(1)
    }
    case 'latexTable':
      return 'Tabela'
    case 'calloutBlock': {
      const calloutType = node.attrs.calloutType as string
      const info = getAllCalloutTypes().find(t => t.value === calloutType)
      return info?.label ?? calloutType.charAt(0).toUpperCase() + calloutType.slice(1)
    }
    case 'rawLatex':
      return 'LaTeX bruto'
    default:
      return node.type.name
  }
}

/** Whether this block type supports text-based transforms */
function isTextBlock(node: ProseMirrorNode): boolean {
  const textTypes = [
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'blockquote',
    'codeBlock',
  ]
  return textTypes.includes(node.type.name)
}

const transformOptions = [
  { label: 'Parágrafo', icon: Type, type: 'paragraph' },
  { label: 'Título 1', icon: Heading1, type: 'heading', level: 1 },
  { label: 'Título 2', icon: Heading2, type: 'heading', level: 2 },
  { label: 'Título 3', icon: Heading3, type: 'heading', level: 3 },
  { label: 'Lista', icon: List, type: 'bulletList' },
  { label: 'Lista numerada', icon: ListOrdered, type: 'orderedList' },
  { label: 'Citação', icon: Quote, type: 'blockquote' },
  { label: 'Código', icon: Code2, type: 'codeBlock' },
] as const

export function BlockHandle({ editor }: Props) {
  const [hovered, setHovered] = useState(false)
  const [activeBlock, setActiveBlock] = useState<BlockInfo | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const handleRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveringHandleRef = useRef(false)

  // Find the closest top-level block to a given Y coordinate
  const findBlockAtY = useCallback(
    (y: number): BlockInfo | null => {
      const doc = editor.state.doc
      let closest: BlockInfo | null = null
      let closestDist = Infinity

      let index = 0
      doc.forEach((node, offset) => {
        try {
          const dom = editor.view.nodeDOM(offset) as HTMLElement | null
          if (!dom || typeof dom.getBoundingClientRect !== 'function') return
          const rect = dom.getBoundingClientRect()
          const midY = rect.top + rect.height / 2
          const dist = Math.abs(y - midY)
          // Prefer blocks whose rect contains the Y, otherwise closest midpoint
          const contains = y >= rect.top && y <= rect.bottom
          if (contains || dist < closestDist) {
            closestDist = contains ? 0 : dist
            closest = { node, pos: offset, domTop: rect.top, index }
          }
        } catch {
          // nodeDOM can throw if DOM is out of sync
        }
        index++
      })

      return closest
    },
    [editor],
  )

  // Mouse tracking on editor DOM
  useEffect(() => {
    const editorDom = editor.view.dom

    function onMouseMove(e: MouseEvent) {
      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }

      const block = findBlockAtY(e.clientY)
      if (block) {
        const editorRect = editorDom.getBoundingClientRect()
        setActiveBlock({
          ...block,
          // Store relative top to editor container parent (the paper div)
          domTop: block.domTop - editorRect.top,
        })
        setHovered(true)
      }
    }

    function onMouseLeave() {
      // Delay hiding so the user can reach the handle
      hideTimeoutRef.current = setTimeout(() => {
        if (!popoverOpen && !hoveringHandleRef.current) {
          setHovered(false)
        }
      }, 300)
    }

    editorDom.addEventListener('mousemove', onMouseMove)
    editorDom.addEventListener('mouseleave', onMouseLeave)

    return () => {
      editorDom.removeEventListener('mousemove', onMouseMove)
      editorDom.removeEventListener('mouseleave', onMouseLeave)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [editor, findBlockAtY, popoverOpen])

  // Keep handle visible when hovering the handle itself
  const onHandleMouseEnter = () => {
    hoveringHandleRef.current = true
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setHovered(true)
  }

  const onHandleMouseLeave = () => {
    hoveringHandleRef.current = false
    if (!popoverOpen) {
      hideTimeoutRef.current = setTimeout(() => {
        if (!hoveringHandleRef.current) {
          setHovered(false)
        }
      }, 300)
    }
  }

  // Close popover on Escape or outside click
  useEffect(() => {
    if (!popoverOpen) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPopoverOpen(false)
      }
    }

    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        handleRef.current &&
        !handleRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setPopoverOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [popoverOpen])

  // When popover closes, also check if mouse is still near
  useEffect(() => {
    if (!popoverOpen) {
      // Give a grace period before hiding handle
      hideTimeoutRef.current = setTimeout(() => {
        if (!hoveringHandleRef.current) {
          setHovered(false)
        }
      }, 300)
    }
  }, [popoverOpen])

  // ---- Actions ----

  /** Re-read the current block info since state may have changed */
  function freshBlock(): BlockInfo | null {
    if (!activeBlock) return null
    // Revalidate position
    const doc = editor.state.doc
    let result: BlockInfo | null = null
    let idx = 0
    doc.forEach((node, offset) => {
      if (offset === activeBlock.pos) {
        result = { node, pos: offset, domTop: activeBlock.domTop, index: idx }
      }
      idx++
    })
    return result
  }

  function handleTransform(type: string, level?: number) {
    const block = freshBlock()
    if (!block) return

    // We need to set selection inside the block first
    const insidePos = block.pos + 1

    try {
      const chain = editor.chain().focus().setTextSelection(insidePos)

      switch (type) {
        case 'paragraph':
          // Lift from list/blockquote first, then set paragraph
          chain.clearNodes().setParagraph().run()
          break
        case 'heading':
          chain.clearNodes().setHeading({ level: level as 1 | 2 | 3 }).run()
          break
        case 'bulletList':
          chain.clearNodes().toggleBulletList().run()
          break
        case 'orderedList':
          chain.clearNodes().toggleOrderedList().run()
          break
        case 'blockquote':
          chain.clearNodes().toggleBlockquote().run()
          break
        case 'codeBlock':
          chain.clearNodes().toggleCodeBlock().run()
          break
      }
    } catch {
      // Some transforms may not be applicable
    }

    setPopoverOpen(false)
  }

  function handleAlignment(alignment: 'left' | 'center' | 'right') {
    const block = freshBlock()
    if (!block) return

    try {
      const insidePos = block.pos + 1
      editor.chain().focus().setTextSelection(insidePos).setTextAlign(alignment).run()
    } catch {
      // alignment may not be supported for this block
    }

    setPopoverOpen(false)
  }

  function handleDuplicate() {
    const block = freshBlock()
    if (!block) return

    const endPos = block.pos + block.node.nodeSize
    const nodeJson = block.node.toJSON()

    try {
      editor
        .chain()
        .focus()
        .insertContentAt(endPos, nodeJson)
        .run()
    } catch {
      // insertion might fail for certain node types
    }

    setPopoverOpen(false)
  }

  function handleDelete() {
    const block = freshBlock()
    if (!block) return

    editor
      .chain()
      .focus()
      .deleteRange({ from: block.pos, to: block.pos + block.node.nodeSize })
      .run()

    setPopoverOpen(false)
    setActiveBlock(null)
    setHovered(false)
  }

  function handleMoveUp() {
    const block = freshBlock()
    if (!block || block.index === 0) return

    const { tr } = editor.state
    const doc = editor.state.doc

    // Find the previous sibling
    let prevPos = -1
    let prevNode: ProseMirrorNode | null = null
    let idx = 0
    doc.forEach((node, offset) => {
      if (idx === block.index - 1) {
        prevPos = offset
        prevNode = node
      }
      idx++
    })

    if (prevPos === -1 || !prevNode) return

    // Strategy: delete current block, then insert it before the previous sibling
    const currentNode = block.node
    const currentFrom = block.pos
    const currentTo = block.pos + currentNode.nodeSize

    // Delete current block first
    tr.delete(currentFrom, currentTo)
    // After deletion, prevPos is still valid since it's before currentFrom
    // Insert the current node at prevPos
    tr.insert(prevPos, currentNode)

    editor.view.dispatch(tr)

    // Update active block position
    setActiveBlock((prev) =>
      prev ? { ...prev, pos: prevPos, index: prev.index - 1 } : null,
    )

    setPopoverOpen(false)
  }

  function handleMoveDown() {
    const block = freshBlock()
    if (!block) return

    const doc = editor.state.doc
    const totalBlocks = doc.childCount
    if (block.index >= totalBlocks - 1) return

    const { tr } = editor.state

    // Find the next sibling
    let nextPos = -1
    let nextNode: ProseMirrorNode | null = null
    let idx = 0
    doc.forEach((node, offset) => {
      if (idx === block.index + 1) {
        nextPos = offset
        nextNode = node
      }
      idx++
    })

    if (nextPos === -1 || !nextNode) return
    const resolvedNext: ProseMirrorNode = nextNode

    // Strategy: delete next block, then insert it before current block
    const nextFrom = nextPos
    const nextTo = nextPos + resolvedNext.nodeSize

    // Delete the next block
    tr.delete(nextFrom, nextTo)
    // Insert it at the current block's position (before it)
    tr.insert(block.pos, resolvedNext)

    editor.view.dispatch(tr)

    // Update active block position: it's now shifted forward by the next node's size
    setActiveBlock((prev) =>
      prev
        ? { ...prev, pos: prev.pos + resolvedNext.nodeSize, index: prev.index + 1 }
        : null,
    )

    setPopoverOpen(false)
  }

  // Prevent editor blur on any interaction with handle/popover
  const preventBlur = (e: React.MouseEvent) => e.preventDefault()

  if (!activeBlock) return null

  const isVisible = hovered || popoverOpen
  const totalBlocks = editor.state.doc.childCount
  const canMoveUp = activeBlock.index > 0
  const canMoveDown = activeBlock.index < totalBlocks - 1
  const showTransforms = isTextBlock(activeBlock.node)

  return (
    <div
      ref={handleRef}
      className="absolute z-30"
      style={{
        top: activeBlock.domTop,
        left: 40,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 150ms ease',
      }}
      onMouseDown={preventBlur}
      onMouseEnter={onHandleMouseEnter}
      onMouseLeave={onHandleMouseLeave}
    >
      {/* Drag handle button */}
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className="flex items-center justify-center w-5 h-7 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-grab"
        title="Opções do bloco"
      >
        <GripVertical size={16} />
      </button>

      {/* Popover */}
      {popoverOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-8 bg-surface-elevated rounded-xl shadow-xl border border-surface-border w-52 py-1.5 select-none"
          style={{ zIndex: 50 }}
          onMouseDown={preventBlur}
        >
          {/* Block type label */}
          <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-text-muted font-semibold">
            {getBlockLabel(activeBlock.node)}
          </div>

          {/* Separator */}
          <div className="border-t border-surface-border my-1" />

          {/* Transform section */}
          {showTransforms && (
            <>
              <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-text-muted font-semibold">
                Transformar
              </div>
              {transformOptions.map((opt) => {
                const Icon = opt.icon
                const isActive =
                  (opt.type === 'paragraph' && activeBlock.node.type.name === 'paragraph') ||
                  (opt.type === 'heading' &&
                    activeBlock.node.type.name === 'heading' &&
                    activeBlock.node.attrs.level === opt.level) ||
                  (opt.type === 'bulletList' && activeBlock.node.type.name === 'bulletList') ||
                  (opt.type === 'orderedList' && activeBlock.node.type.name === 'orderedList') ||
                  (opt.type === 'blockquote' && activeBlock.node.type.name === 'blockquote') ||
                  (opt.type === 'codeBlock' && activeBlock.node.type.name === 'codeBlock')
                return (
                  <button
                    key={opt.label}
                    onClick={() =>
                      handleTransform(opt.type, 'level' in opt ? opt.level : undefined)
                    }
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-[13px] transition-colors cursor-pointer ${
                      isActive
                        ? 'text-accent-600 bg-accent-500/15 font-medium'
                        : 'text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    {opt.label}
                  </button>
                )
              })}

              {/* Separator */}
              <div className="border-t border-surface-border my-1" />

              {/* Alignment row */}
              <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-text-muted font-semibold">
                Alinhamento
              </div>
              <div className="flex items-center gap-0.5 px-2 py-1">
                {(
                  [
                    { align: 'left' as const, Icon: AlignLeft },
                    { align: 'center' as const, Icon: AlignCenter },
                    { align: 'right' as const, Icon: AlignRight },
                  ] as const
                ).map(({ align, Icon }) => {
                  const currentAlign = activeBlock.node.attrs.textAlign || 'left'
                  const isActive = currentAlign === align
                  return (
                    <button
                      key={align}
                      onClick={() => handleAlignment(align)}
                      className={`p-1.5 rounded transition-colors ${
                        isActive
                          ? 'text-accent-600 bg-accent-500/15'
                          : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                      }`}
                      title={
                        align === 'left'
                          ? 'Alinhar à esquerda'
                          : align === 'center'
                            ? 'Centralizar'
                            : 'Alinhar à direita'
                      }
                    >
                      <Icon size={14} />
                    </button>
                  )
                })}
              </div>

              {/* Separator */}
              <div className="border-t border-surface-border my-1" />
            </>
          )}

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[13px] text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <Copy size={14} className="shrink-0" />
            Duplicar
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[13px] text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 size={14} className="shrink-0" />
            Excluir
          </button>

          {/* Separator */}
          <div className="border-t border-surface-border my-1" />

          {/* Move up */}
          <button
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-[13px] transition-colors cursor-pointer ${
              canMoveUp
                ? 'text-text-primary hover:bg-surface-hover'
                : 'text-text-muted/40 cursor-not-allowed'
            }`}
          >
            <ArrowUp size={14} className="shrink-0" />
            Mover para cima
          </button>

          {/* Move down */}
          <button
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-[13px] transition-colors cursor-pointer ${
              canMoveDown
                ? 'text-text-primary hover:bg-surface-hover'
                : 'text-text-muted/40 cursor-not-allowed'
            }`}
          >
            <ArrowDown size={14} className="shrink-0" />
            Mover para baixo
          </button>
        </div>
      )}
    </div>
  )
}
