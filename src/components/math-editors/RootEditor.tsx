import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldRow, FieldGroup } from './MathModalShell'
import { parseRoot, buildRoot } from './detectMathType'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function RootEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const parsed = parseRoot(initialLatex)
  const [index, setIndex] = useState(parsed.index)
  const [radicand, setRadicand] = useState(parsed.radicand)

  const latex = buildRoot({ index, radicand })

  function handleSave() { onSave(latex) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title="Raiz"
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldRow>
        <FieldGroup>
          <FieldLabel>Índice (opcional)</FieldLabel>
          <FieldInput value={index} onChange={setIndex} placeholder="vazio = raiz quadrada" onKeyDown={handleKey} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Radicando</FieldLabel>
          <FieldInput value={radicand} onChange={setRadicand} autoFocus placeholder="x" onKeyDown={handleKey} />
        </FieldGroup>
      </FieldRow>
    </MathModalShell>
  )
}
