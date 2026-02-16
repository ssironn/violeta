import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { DocumentConfig } from '../../types/documentConfig'
import { SUGGESTED_PACKAGES } from '../../types/documentConfig'

interface DocumentConfigPanelProps {
  config: DocumentConfig
  onChange: (config: DocumentConfig) => void
}

function SelectField({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="docconfig-field">
      <label className="docconfig-label">{label}</label>
      <select
        className="docconfig-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function RadioGroup({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="docconfig-field">
      <label className="docconfig-label">{label}</label>
      <div className="docconfig-radio-group">
        {options.map((o) => (
          <label key={o.value} className="docconfig-radio">
            <input
              type="radio"
              name={label}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function DocumentConfigPanel({ config, onChange }: DocumentConfigPanelProps) {
  const [pkgInput, setPkgInput] = useState('')

  function update<K extends keyof DocumentConfig>(key: K, value: DocumentConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  function addPackage(pkg: string) {
    const name = pkg.trim()
    if (!name || config.extraPackages.includes(name)) return
    update('extraPackages', [...config.extraPackages, name])
    setPkgInput('')
  }

  function removePackage(pkg: string) {
    update('extraPackages', config.extraPackages.filter((p) => p !== pkg))
  }

  const suggestionsFiltered = SUGGESTED_PACKAGES.filter(
    (s) => !config.extraPackages.includes(s.name)
  )

  return (
    <div className="docconfig-panel">
      <div className="docconfig-inner">
        {/* Classe e Layout */}
        <div className="docconfig-section">
          <h4 className="docconfig-section-title">Classe e Layout</h4>
          <div className="docconfig-row">
            <SelectField
              label="Classe"
              value={config.documentClass}
              options={[
                { value: 'article', label: 'article' },
                { value: 'report', label: 'report' },
                { value: 'book', label: 'book' },
              ]}
              onChange={(v) => update('documentClass', v as DocumentConfig['documentClass'])}
            />
            <SelectField
              label="Fonte"
              value={config.fontSize}
              options={[
                { value: '10pt', label: '10pt' },
                { value: '11pt', label: '11pt' },
                { value: '12pt', label: '12pt' },
              ]}
              onChange={(v) => update('fontSize', v as DocumentConfig['fontSize'])}
            />
            <SelectField
              label="Papel"
              value={config.paperSize}
              options={[
                { value: 'a4paper', label: 'A4' },
                { value: 'letterpaper', label: 'Letter' },
              ]}
              onChange={(v) => update('paperSize', v as DocumentConfig['paperSize'])}
            />
            <div className="docconfig-field">
              <label className="docconfig-label">Margem</label>
              <input
                className="docconfig-input"
                type="text"
                value={config.margin}
                onChange={(e) => update('margin', e.target.value)}
                placeholder="2.5cm"
              />
            </div>
          </div>
        </div>

        {/* Idioma */}
        <div className="docconfig-section">
          <h4 className="docconfig-section-title">Idioma</h4>
          <SelectField
            label="Idioma do documento"
            value={config.language}
            options={[
              { value: 'brazilian', label: 'Português (Brasil)' },
              { value: 'english', label: 'English' },
              { value: 'spanish', label: 'Español' },
              { value: 'french', label: 'Français' },
              { value: 'german', label: 'Deutsch' },
            ]}
            onChange={(v) => update('language', v as DocumentConfig['language'])}
          />
        </div>

        {/* Demonstrações */}
        <div className="docconfig-section">
          <h4 className="docconfig-section-title">Demonstrações</h4>
          <SelectField
            label="Símbolo QED"
            value={config.qedSymbol}
            options={[
              { value: '$\\blacksquare$', label: '\u25A0 (blacksquare)' },
              { value: '$\\square$', label: '\u25A1 (square)' },
              { value: '$\\diamondsuit$', label: '\u2666 (diamondsuit)' },
              { value: 'QED', label: 'QED' },
            ]}
            onChange={(v) => update('qedSymbol', v as DocumentConfig['qedSymbol'])}
          />
        </div>

        {/* Teoremas */}
        <div className="docconfig-section">
          <h4 className="docconfig-section-title">Teoremas</h4>
          <RadioGroup
            label="Numeração"
            value={config.theoremNumbering}
            options={[
              { value: 'continuous', label: 'Contínua (1, 2, 3...)' },
              { value: 'by-section', label: 'Por seção (1.1, 1.2...)' },
            ]}
            onChange={(v) => update('theoremNumbering', v as DocumentConfig['theoremNumbering'])}
          />
        </div>

        {/* Pacotes adicionais */}
        <div className="docconfig-section">
          <h4 className="docconfig-section-title">Pacotes adicionais</h4>

          {config.extraPackages.length > 0 && (
            <div className="docconfig-chips">
              {config.extraPackages.map((pkg) => (
                <span key={pkg} className="docconfig-chip">
                  {pkg}
                  <button onClick={() => removePackage(pkg)} className="docconfig-chip-remove">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="docconfig-pkg-input-row">
            <input
              className="docconfig-input docconfig-pkg-input"
              type="text"
              value={pkgInput}
              onChange={(e) => setPkgInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addPackage(pkgInput) }}
              placeholder="Nome do pacote..."
            />
            <button
              className="docconfig-pkg-add"
              onClick={() => addPackage(pkgInput)}
              disabled={!pkgInput.trim()}
            >
              <Plus size={12} />
              Adicionar
            </button>
          </div>

          {suggestionsFiltered.length > 0 && (
            <div className="docconfig-suggestions">
              <span className="docconfig-suggestions-label">Sugestões:</span>
              {suggestionsFiltered.map((s) => (
                <button
                  key={s.name}
                  className="docconfig-suggestion"
                  onClick={() => addPackage(s.name)}
                  title={s.description}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
