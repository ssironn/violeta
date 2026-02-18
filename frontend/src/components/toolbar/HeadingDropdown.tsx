import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/core'
import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

interface HeadingDropdownProps {
  editor: Editor
}

const options = [
  { label: 'Parágrafo', value: 0 },
  { label: 'Título 1', value: 1 },
  { label: 'Título 2', value: 2 },
  { label: 'Título 3', value: 3 },
  { label: 'Título 4', value: 4 },
] as const

export function HeadingDropdown({ editor }: HeadingDropdownProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  const current = options.find(
    (o) => o.value > 0 && editor.isActive('heading', { level: o.value })
  ) ?? options[0]

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) updatePosition()
  }, [open, updatePosition])

  function select(value: number) {
    if (value === 0) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level: value as 1 | 2 | 3 | 4 }).run()
    }
    setOpen(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors',
          'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
          'min-w-[90px] justify-between'
        )}
      >
        <span>{current.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-surface-elevated border border-surface-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={clsx(
                'w-full text-left px-3 py-1.5 text-sm transition-colors',
                'hover:bg-surface-hover',
                current.value === o.value
                  ? 'text-accent font-medium'
                  : 'text-text-secondary'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
