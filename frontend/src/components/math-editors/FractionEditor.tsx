import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldGroup } from './MathModalShell'
import { parseFraction, buildFraction } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function FractionEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseFraction(initialLatex)
  const [num, setNum] = useState(parsed.numerator)
  const [den, setDen] = useState(parsed.denominator)

  const latex = buildFraction({ numerator: num, denominator: den })

  function handleSave() {
    onSave(latex)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title="Fração"
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      {/* Visual fraction layout */}
      <div className="flex flex-col items-center gap-1 py-2">
        <FieldGroup>
          <FieldLabel>Numerador</FieldLabel>
          <FieldInput value={num} onChange={setNum} autoFocus placeholder="a" onKeyDown={handleKey} />
        </FieldGroup>

        <div className="w-48 h-px bg-accent-400/40 my-1 rounded-full" />

        <FieldGroup>
          <FieldLabel>Denominador</FieldLabel>
          <FieldInput value={den} onChange={setDen} placeholder="b" onKeyDown={handleKey} />
        </FieldGroup>
      </div>
    </MathModalShell>
  )
}
