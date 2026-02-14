import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldRow, FieldGroup } from './MathModalShell'
import { parseLimit, buildLimit } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function LimitEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseLimit(initialLatex)
  const [variable, setVariable] = useState(parsed.variable)
  const [approaches, setApproaches] = useState(parsed.approaches)
  const [expression, setExpression] = useState(parsed.expression)

  const latex = buildLimit({ variable, approaches, expression })

  function handleSave() { onSave(latex) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title="Limite"
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldRow>
        <FieldGroup>
          <FieldLabel>Variável</FieldLabel>
          <FieldInput value={variable} onChange={setVariable} autoFocus placeholder="x" onKeyDown={handleKey} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Tende a</FieldLabel>
          <FieldInput value={approaches} onChange={setApproaches} placeholder="\infty" onKeyDown={handleKey} />
        </FieldGroup>
      </FieldRow>

      <FieldGroup>
        <FieldLabel>Expressão</FieldLabel>
        <FieldInput value={expression} onChange={setExpression} placeholder="f(x)" onKeyDown={handleKey} />
      </FieldGroup>
    </MathModalShell>
  )
}
