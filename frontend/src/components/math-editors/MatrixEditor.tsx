import { useState, useRef, useEffect } from 'react'
import { Plus, Minus, ChevronDown } from 'lucide-react'
import { MathModalShell } from './MathModalShell'
import { parseMatrix, buildMatrix } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

type GenericMode = 'off' | 'mxn' | 'nxn'

function cellLetter(r: number, c: number, totalCols: number): string {
  return String.fromCharCode(97 + (r * totalCols + c) % 26)
}

/** Build the 4×4 generic cells using the given element letter and index letters. */
function buildGenericCells(mode: 'mxn' | 'nxn', el: string, rowIdx: string, colIdx: string): string[][] {
  const lastRow = mode === 'nxn' ? colIdx : rowIdx
  return [
    [`${el}_{11}`, `${el}_{12}`, '\\cdots', `${el}_{1${colIdx}}`],
    [`${el}_{21}`, `${el}_{22}`, '\\cdots', `${el}_{2${colIdx}}`],
    ['\\vdots', '\\vdots', '\\ddots', '\\vdots'],
    [`${el}_{${lastRow}1}`, `${el}_{${lastRow}2}`, '\\cdots', `${el}_{${lastRow}${colIdx}}`],
  ]
}

/** Whether a cell in generic mode is a dots placeholder (not editable). */
function isDotsCell(r: number, c: number): boolean {
  return r === 2 || c === 2
}

/** The display symbol for a dots cell. */
function dotsSymbol(r: number, c: number): string {
  if (r === 2 && c === 2) return '⋱'
  if (r === 2) return '⋮'
  return '⋯'
}

export function MatrixEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseMatrix(initialLatex)
  const [rows, setRows] = useState(parsed.rows)
  const [cols, setCols] = useState(parsed.cols)
  const [cells, setCells] = useState<string[][]>(parsed.cells)
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null)
  const [enumerate, setEnumerate] = useState(false)
  const [genericMode, setGenericMode] = useState<GenericMode>('off')
  const [elementLetter, setElementLetter] = useState('a')
  const [rowIndexLetter, setRowIndexLetter] = useState('m')
  const [colIndexLetter, setColIndexLetter] = useState('n')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const cellsBeforeEnumerate = useRef<string[][] | null>(null)
  const cellsBeforeGeneric = useRef<{ rows: number; cols: number; cells: string[][] } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const isGeneric = genericMode !== 'off'

  function enumerateCells(r: number, c: number): string {
    return `${elementLetter}_{${r + 1}${c + 1}}`
  }

  function toggleEnumerate(checked: boolean) {
    setEnumerate(checked)
    if (checked) {
      cellsBeforeEnumerate.current = cells.map(row => [...row])
      setCells(prev => prev.map((row, r) => row.map((_, c) => enumerateCells(r, c))))
    } else {
      if (cellsBeforeEnumerate.current) {
        setCells(cellsBeforeEnumerate.current)
        cellsBeforeEnumerate.current = null
      }
    }
  }

  function applyGenericMode(mode: 'mxn' | 'nxn') {
    setRows(4)
    setCols(4)
    setCells(buildGenericCells(mode, elementLetter, rowIndexLetter, colIndexLetter))
  }

  function toggleGenericMode(mode: GenericMode) {
    const prev = genericMode
    setGenericMode(mode)

    if (mode !== 'off' && prev === 'off') {
      // Entering generic mode — save current state
      cellsBeforeGeneric.current = { rows, cols, cells: cells.map(row => [...row]) }
      setEnumerate(false)
      cellsBeforeEnumerate.current = null
      applyGenericMode(mode)
    } else if (mode !== 'off' && prev !== 'off') {
      // Switching between mxn and nxn
      applyGenericMode(mode)
    } else {
      // Leaving generic mode — restore
      if (cellsBeforeGeneric.current) {
        setRows(cellsBeforeGeneric.current.rows)
        setCols(cellsBeforeGeneric.current.cols)
        setCells(cellsBeforeGeneric.current.cells)
        cellsBeforeGeneric.current = null
      }
    }
  }

  // Re-generate generic cells when letters change
  function updateElementLetter(val: string) {
    const letter = val.slice(-1) || 'a'
    setElementLetter(letter)
    if (isGeneric) {
      setCells(buildGenericCells(genericMode as 'mxn' | 'nxn', letter, rowIndexLetter, colIndexLetter))
    } else if (enumerate) {
      setCells(prev => prev.map((row, r) => row.map((_, c) => `${letter}_{${r + 1}${c + 1}}`)))
    }
  }

  function updateRowIndexLetter(val: string) {
    const letter = val.slice(-1) || 'm'
    setRowIndexLetter(letter)
    if (isGeneric) {
      setCells(buildGenericCells(genericMode as 'mxn' | 'nxn', elementLetter, letter, colIndexLetter))
    }
  }

  function updateColIndexLetter(val: string) {
    const letter = val.slice(-1) || 'n'
    setColIndexLetter(letter)
    if (isGeneric) {
      setCells(buildGenericCells(genericMode as 'mxn' | 'nxn', elementLetter, rowIndexLetter, letter))
    }
  }

  // Sync cells when dimensions change
  function resizeCells(newRows: number, newCols: number) {
    setCells(prev => {
      const next: string[][] = []
      for (let r = 0; r < newRows; r++) {
        const row: string[] = []
        for (let c = 0; c < newCols; c++) {
          if (enumerate) {
            row.push(enumerateCells(r, c))
          } else {
            row.push(prev[r]?.[c] ?? cellLetter(r, c, newCols))
          }
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
      {/* Dimension controls — hidden in generic mode */}
      {!isGeneric && (
        <div className="flex items-center justify-center gap-6 mb-2">
          <DimControl label="Linhas" value={rows} onInc={addRow} onDec={removeRow} />
          <div className="text-accent-500/40 text-lg font-light">&times;</div>
          <DimControl label="Colunas" value={cols} onInc={addCol} onDec={removeCol} />
        </div>
      )}

      {/* Options */}
      <div className="flex items-center justify-center gap-5 mb-1">
        {/* Enumerate checkbox — hidden in generic mode */}
        {!isGeneric && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enumerate}
              onChange={(e) => toggleEnumerate(e.target.checked)}
              className="w-3.5 h-3.5 rounded border border-white/[0.12] bg-black/20 accent-accent-500 cursor-pointer"
            />
            <span className="text-[11px] text-accent-300/50">
              Enumerar elementos ({elementLetter}&#8203;<sub>ij</sub>)
            </span>
          </label>
        )}

        {/* Generic m×n checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={genericMode === 'mxn'}
            onChange={(e) => toggleGenericMode(e.target.checked ? 'mxn' : 'off')}
            className="w-3.5 h-3.5 rounded border border-white/[0.12] bg-black/20 accent-accent-500 cursor-pointer"
          />
          <span className="text-[11px] text-accent-300/50">
            Genérica {rowIndexLetter} &times; {colIndexLetter}
          </span>
        </label>

        {/* Generic n×n checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={genericMode === 'nxn'}
            onChange={(e) => toggleGenericMode(e.target.checked ? 'nxn' : 'off')}
            className="w-3.5 h-3.5 rounded border border-white/[0.12] bg-black/20 accent-accent-500 cursor-pointer"
          />
          <span className="text-[11px] text-accent-300/50">
            Quadrada {colIndexLetter} &times; {colIndexLetter}
          </span>
        </label>
      </div>

      {/* Advanced options toggle */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1 text-[10px] text-accent-300/30 hover:text-accent-300/50 transition-colors"
        >
          Opções avançadas
          <ChevronDown
            size={10}
            className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Advanced options panel */}
      {showAdvanced && (
        <div className="flex items-center justify-center gap-4 mb-2 py-2 px-3 rounded-lg border border-white/[0.04] bg-black/20">
          <LetterInput
            label="Elemento"
            value={elementLetter}
            onChange={updateElementLetter}
          />
          {genericMode !== 'nxn' && (
            <LetterInput
              label="Índice linhas"
              value={rowIndexLetter}
              onChange={updateRowIndexLetter}
            />
          )}
          <LetterInput
            label={genericMode === 'nxn' ? 'Índice ordem' : 'Índice colunas'}
            value={colIndexLetter}
            onChange={updateColIndexLetter}
          />
        </div>
      )}

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
            row.map((val, c) =>
              isGeneric && isDotsCell(r, c) ? (
                <div
                  key={`${r}-${c}`}
                  className="w-16 h-9 flex items-center justify-center text-lg text-accent-300/40 select-none"
                >
                  {dotsSymbol(r, c)}
                </div>
              ) : (
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
              )
            )
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

// ─── Small sub-components ─────────────────────────────────────────

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

function LetterInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-accent-300/40 whitespace-nowrap">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 text-center text-xs font-mono rounded border border-white/[0.08] bg-black/30 text-accent-200 focus:outline-none focus:border-accent-500/40"
      />
    </div>
  )
}
