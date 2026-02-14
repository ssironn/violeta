import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldRow, FieldGroup } from './MathModalShell'
import { parseDoubleIntegral, buildDoubleIntegral } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function DoubleIntegralEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseDoubleIntegral(initialLatex)
  const [domain, setDomain] = useState(parsed.domain)
  const [integrand, setIntegrand] = useState(parsed.integrand)
  const [area, setArea] = useState(parsed.area)

  const latex = buildDoubleIntegral({ domain, integrand, area })

  function handleSave() { onSave(latex) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title="Integral Dupla"
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldRow>
        <FieldGroup>
          <FieldLabel>Domínio</FieldLabel>
          <FieldInput value={domain} onChange={setDomain} autoFocus placeholder="D" onKeyDown={handleKey} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Elemento de área</FieldLabel>
          <FieldInput value={area} onChange={setArea} placeholder="A" onKeyDown={handleKey} />
        </FieldGroup>
      </FieldRow>

      <FieldGroup>
        <FieldLabel>Integrando</FieldLabel>
        <FieldInput value={integrand} onChange={setIntegrand} placeholder="f(x,y)" onKeyDown={handleKey} />
      </FieldGroup>
    </MathModalShell>
  )
}
