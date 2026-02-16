import { useState, useRef, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { MathModalShell } from './MathModalShell'
import { parseMatrix, buildMatrix } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

function cellLetter(r: number, c: number, totalCols: number): string {
  return String.fromCharCode(97 + (r * totalCols + c) % 26)
}

export function MatrixEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseMatrix(initialLatex)
  const [rows, setRows] = useState(parsed.rows)
  const [cols, setCols] = useState(parsed.cols)
  const [cells, setCells] = useState<string[][]>(parsed.cells)
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Sync cells when dimensions change — new cells get default letters
  function resizeCells(newRows: number, newCols: number) {
    setCells(prev => {
      const next: string[][] = []
      for (let r = 0; r < newRows; r++) {
        const row: string[] = []
        for (let c = 0; c < newCols; c++) {
          row.push(prev[r]?.[c] ?? cellLetter(r, c, newCols))
        }
        next.push(row)
      }
      return next
    })
  }

  function addRow() {
    const n = rows + 1
    setRows(n)
    resizeCells(n, cols)
  }

  function removeRow() {
    if (rows <= 1) return
    const n = rows - 1
    setRows(n)
    resizeCells(n, cols)
  }

  function addCol() {
    const n = cols + 1
    setCols(n)
    resizeCells(rows, n)
  }

  function removeCol() {
    if (cols <= 1) return
    const n = cols - 1
    setCols(n)
    resizeCells(rows, n)
  }

  function updateCell(r: number, c: number, val: string) {
    setCells(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = val
      return next
    })
  }

  const latex = buildMatrix({ rows, cols, cells })

  function handleSave() { onSave(latex) }

  function handleCellKeyDown(e: React.KeyboardEvent, r: number, c: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
      return
    }
    // Arrow-key navigation
    if (e.key === 'Tab') {
      e.preventDefault()
      const nextC = (c + 1) % cols
      const nextR = nextC === 0 ? (r + 1) % rows : r
      setFocusedCell([nextR, nextC])
    }
    if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
      if (c < cols - 1) setFocusedCell([r, c + 1])
    }
    if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      if (c > 0) setFocusedCell([r, c - 1])
    }
    if (e.key === 'ArrowDown') {
      if (r < rows - 1) setFocusedCell([r + 1, c])
    }
    if (e.key === 'ArrowUp') {
      if (r > 0) setFocusedCell([r - 1, c])
    }
  }

  // Focus cell when focusedCell changes
  useEffect(() => {
    if (!focusedCell || !gridRef.current) return
    const [r, c] = focusedCell
    const input = gridRef.current.querySelector<HTMLInputElement>(`[data-cell="${r}-${c}"]`)
    input?.focus()
  }, [focusedCell])

  // Auto-focus first cell on mount
  useEffect(() => {
    setFocusedCell([0, 0])
  }, [])

  return (
    <MathModalShell
      title="Matriz"
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
      wide
    >
      {/* Dimension controls */}
      <div className="flex items-center justify-center gap-6 mb-2">
        <DimControl label="Linhas" value={rows} onInc={addRow} onDec={removeRow} />
        <div className="text-accent-500/40 text-lg font-light">&times;</div>
        <DimControl label="Colunas" value={cols} onInc={addCol} onDec={removeCol} />
      </div>

      {/* Matrix grid */}
      <div className="flex items-center justify-center py-2">
        {/* Left bracket */}
        <div className="text-accent-400/50 text-4xl font-extralight mr-2 self-stretch flex items-center">(</div>

        <div
          ref={gridRef}
          className="inline-grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cells.map((row, r) =>
            row.map((val, c) => (
              <input
                key={`${r}-${c}`}
                data-cell={`${r}-${c}`}
                type="text"
                value={val}
                onChange={(e) => updateCell(r, c, e.target.value)}
                onFocus={() => setFocusedCell([r, c])}
                onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                className={`w-16 h-9 text-center text-sm font-mono rounded-lg border transition-all focus:outline-none ${
                  focusedCell?.[0] === r && focusedCell?.[1] === c
                    ? 'border-accent-500/60 bg-accent-500/10 text-accent-100 ring-1 ring-accent-500/20'
                    : 'border-white/[0.06] bg-black/20 text-accent-200 hover:border-white/[0.12]'
                }`}
                placeholder={String.fromCharCode(97 + (r * cols + c) % 26)}
              />
            ))
          )}
        </div>

        {/* Right bracket */}
        <div className="text-accent-400/50 text-4xl font-extralight ml-2 self-stretch flex items-center">)</div>
      </div>

      <p className="text-[11px] text-accent-300/30 text-center">
        Use Tab para navegar entre células · Setas para mover
      </p>
    </MathModalShell>
  )
}

// ─── Dimension control ────────────────────────────────────────────

function DimControl({
  label,
  value,
  onInc,
  onDec,
}: {
  label: string
  value: number
  onInc: () => void
  onDec: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-accent-300/50 mr-1">
        {label}
      </span>
      <button
        onClick={onDec}
        disabled={value <= 1}
        className="w-6 h-6 rounded-md flex items-center justify-center border border-white/[0.08] bg-black/20 text-accent-300 hover:bg-accent-500/20 hover:border-accent-500/30 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <Minus size={12} />
      </button>
      <span className="text-sm font-mono text-accent-200 w-5 text-center tabular-nums">{value}</span>
      <button
        onClick={onInc}
        className="w-6 h-6 rounded-md flex items-center justify-center border border-white/[0.08] bg-black/20 text-accent-300 hover:bg-accent-500/20 hover:border-accent-500/30 transition-colors"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
