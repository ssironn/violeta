import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldRow, FieldGroup } from './MathModalShell'
import { parseDerivative, buildDerivative } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function DerivativeEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseDerivative(initialLatex)
  const [func, setFunc] = useState(parsed.func)
  const [variable, setVariable] = useState(parsed.variable)
  const [isPartial, setIsPartial] = useState(parsed.isPartial)

  const latex = buildDerivative({ func, variable, isPartial })

  function handleSave() { onSave(latex) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title={isPartial ? 'Derivada Parcial' : 'Derivada'}
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldRow>
        <FieldGroup>
          <FieldLabel>Função</FieldLabel>
          <FieldInput value={func} onChange={setFunc} autoFocus placeholder="f(x)" onKeyDown={handleKey} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Variável</FieldLabel>
          <FieldInput value={variable} onChange={setVariable} placeholder="x" onKeyDown={handleKey} />
        </FieldGroup>
      </FieldRow>

      {/* Partial toggle */}
      <button
        type="button"
        onClick={() => setIsPartial(!isPartial)}
        className="flex items-center gap-2.5 group cursor-pointer mt-1"
      >
        <div
          className={`w-9 h-5 rounded-full transition-colors relative ${
            isPartial ? 'bg-accent-500' : 'bg-white/10'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
              isPartial ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className="text-xs text-accent-300/70 group-hover:text-accent-200 transition-colors font-medium">
          Derivada parcial (∂)
        </span>
      </button>
    </MathModalShell>
  )
}
