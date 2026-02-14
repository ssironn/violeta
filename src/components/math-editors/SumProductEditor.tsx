import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldRow, FieldGroup } from './MathModalShell'
import { parseSumProduct, buildSum, buildProduct } from './detectMathType'

interface Props {
  initialLatex: string
  kind: 'sum' | 'product'
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function SumProductEditor({ initialLatex, kind, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseSumProduct(initialLatex)
  const [variable, setVariable] = useState(parsed.variable)
  const [lower, setLower] = useState(parsed.lower)
  const [upper, setUpper] = useState(parsed.upper)
  const [expression, setExpression] = useState(parsed.expression)

  const build = kind === 'sum' ? buildSum : buildProduct
  const latex = build({ variable, lower, upper, expression })

  function handleSave() { onSave(latex) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title={kind === 'sum' ? 'Somatório' : 'Produtório'}
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldRow>
        <FieldGroup>
          <FieldLabel>Variável</FieldLabel>
          <FieldInput value={variable} onChange={setVariable} autoFocus placeholder="i" onKeyDown={handleKey} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Limite inferior</FieldLabel>
          <FieldInput value={lower} onChange={setLower} placeholder="1" onKeyDown={handleKey} />
        </FieldGroup>
      </FieldRow>

      <FieldGroup>
        <FieldLabel>Limite superior</FieldLabel>
        <FieldInput value={upper} onChange={setUpper} placeholder="n" onKeyDown={handleKey} />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Expressão</FieldLabel>
        <FieldInput value={expression} onChange={setExpression} placeholder="a_i" onKeyDown={handleKey} />
      </FieldGroup>
    </MathModalShell>
  )
}
