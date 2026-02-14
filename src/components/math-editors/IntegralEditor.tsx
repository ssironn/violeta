import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldRow, FieldGroup } from './MathModalShell'
import { parseIntegral, buildIntegral } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function IntegralEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseIntegral(initialLatex)
  const [lower, setLower] = useState(parsed.lower)
  const [upper, setUpper] = useState(parsed.upper)
  const [integrand, setIntegrand] = useState(parsed.integrand)
  const [variable, setVariable] = useState(parsed.variable)

  const latex = buildIntegral({ lower, upper, integrand, variable })

  function handleSave() { onSave(latex) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title="Integral"
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldRow>
        <FieldGroup>
          <FieldLabel>Limite inferior</FieldLabel>
          <FieldInput value={lower} onChange={setLower} autoFocus placeholder="a" onKeyDown={handleKey} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Limite superior</FieldLabel>
          <FieldInput value={upper} onChange={setUpper} placeholder="b" onKeyDown={handleKey} />
        </FieldGroup>
      </FieldRow>

      <FieldGroup>
        <FieldLabel>Integrando</FieldLabel>
        <FieldInput value={integrand} onChange={setIntegrand} placeholder="f(x)" onKeyDown={handleKey} />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Variável</FieldLabel>
        <FieldInput value={variable} onChange={setVariable} placeholder="x" onKeyDown={handleKey} />
      </FieldGroup>
    </MathModalShell>
  )
}
