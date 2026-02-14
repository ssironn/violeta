import { useState } from 'react'
import { MathModalShell, FieldLabel, FieldInput, FieldRow, FieldGroup } from './MathModalShell'
import {
  parseSuperscript,
  parseSubscript,
  buildSuperscript,
  buildSubscript,
} from './detectMathType'

interface Props {
  initialLatex: string
  kind: 'superscript' | 'subscript'
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function SuperSubEditor({ initialLatex, kind, onSave, onDelete, onClose, isInsert }: Props) {
  const isSup = kind === 'superscript'
  const parsed = isSup ? parseSuperscript(initialLatex) : parseSubscript(initialLatex)

  const [base, setBase] = useState(isSup ? (parsed as any).base : (parsed as any).base)
  const [secondary, setSecondary] = useState(
    isSup ? (parsed as any).exponent : (parsed as any).subscript
  )

  const latex = isSup
    ? buildSuperscript({ base, exponent: secondary })
    : buildSubscript({ base, subscript: secondary })

  function handleSave() { onSave(latex) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  return (
    <MathModalShell
      title={isSup ? 'Sobrescrito' : 'Subscrito'}
      latex={latex}
      onSave={handleSave}
      onDelete={onDelete}
      onClose={onClose}
      isInsert={isInsert}
    >
      <FieldRow>
        <FieldGroup>
          <FieldLabel>Base</FieldLabel>
          <FieldInput value={base} onChange={setBase} autoFocus placeholder="x" onKeyDown={handleKey} />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>{isSup ? 'Expoente' : 'Subscrito'}</FieldLabel>
          <FieldInput
            value={secondary}
            onChange={setSecondary}
            placeholder={isSup ? '2' : 'i'}
            onKeyDown={handleKey}
          />
        </FieldGroup>
      </FieldRow>
    </MathModalShell>
  )
}
