import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldGroup } from './MathModalShell'

interface Props {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function GenericEditor({ initialLatex, onSave, onDelete, onClose, isInsert }: Props) {
  const [value, setValue] = useState(initialLatex)

  function handleSave() {
    if (!value.trim()) return
    onSave(value)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title="Expressão LaTeX"
      latex={value}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldGroup>
        <FieldLabel>Código LaTeX</FieldLabel>
        <FieldInput
          value={value}
          onChange={setValue}
          autoFocus
          placeholder="\int_0^1 x^2 \, dx"
          onKeyDown={handleKey}
        />
      </FieldGroup>
    </MathModalShell>
  )
}
