import { useState, useEffect } from 'react'
import {
  FieldLabel,
  FieldInput,
  FieldRow,
  FieldGroup,
} from '../components/math-editors/MathModalShell'
import type { PlotSeries, AxisConfig, FunctionPlot2D, FunctionPlot3D, DataPlot } from './types'

/** Color picker with swatch preview */
function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-lg border border-white/[0.12] cursor-pointer"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-[11px] text-accent-300/60 font-mono">{value}</span>
    </div>
  )
}

/** Numeric input allowing intermediate values */
function NumericInput({
  value,
  onChange,
  placeholder,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
}) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  function handleChange(raw: string) {
    setText(raw)
    if (raw === '' || raw === '-' || raw === '.') return
    const n = parseFloat(raw)
    if (!isNaN(n)) onChange(n)
  }

  function handleBlur() {
    const n = parseFloat(text)
    if (isNaN(n) || text === '') {
      setText(String(value))
    }
  }

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-accent-100 placeholder:text-accent-400/30 focus:outline-none focus:border-accent-500/40 font-mono"
    />
  )
}

interface PlotConfigFormProps {
  plot: PlotSeries
  axis: AxisConfig
  onPlotChange: (updated: PlotSeries) => void
  onAxisChange: (updated: AxisConfig) => void
}

export function PlotConfigForm({ plot, axis, onPlotChange, onAxisChange }: PlotConfigFormProps) {
  function updatePlot(partial: Partial<PlotSeries>) {
    onPlotChange({ ...plot, ...partial } as PlotSeries)
  }

  function updateAxis(partial: Partial<AxisConfig>) {
    onAxisChange({ ...axis, ...partial })
  }

  /* ── Plot-type-specific fields ── */

  function renderFunction2DFields(p: FunctionPlot2D) {
    return (
      <>
        <FieldGroup>
          <FieldLabel>Expressao f(x)</FieldLabel>
          <FieldInput
            value={p.expression}
            onChange={(v) => updatePlot({ expression: v })}
            placeholder="x^2 + 3"
          />
        </FieldGroup>
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Dominio min</FieldLabel>
            <NumericInput
              value={p.domain[0]}
              onChange={(n) => updatePlot({ domain: [n, p.domain[1]] })}
              placeholder="-5"
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Dominio max</FieldLabel>
            <NumericInput
              value={p.domain[1]}
              onChange={(n) => updatePlot({ domain: [p.domain[0], n] })}
              placeholder="5"
            />
          </FieldGroup>
        </FieldRow>
        <FieldGroup>
          <FieldLabel>Amostras</FieldLabel>
          <NumericInput
            value={p.samples}
            onChange={(n) => updatePlot({ samples: Math.max(10, Math.round(n)) })}
            placeholder="100"
          />
        </FieldGroup>
      </>
    )
  }

  function renderFunction3DFields(p: FunctionPlot3D) {
    return (
      <>
        <FieldGroup>
          <FieldLabel>Expressao f(x,y)</FieldLabel>
          <FieldInput
            value={p.expression}
            onChange={(v) => updatePlot({ expression: v })}
            placeholder="sin(deg(x)) * cos(deg(y))"
          />
        </FieldGroup>
        <FieldRow>
          <FieldGroup>
            <FieldLabel>X min</FieldLabel>
            <NumericInput value={p.domainX[0]} onChange={(n) => updatePlot({ domainX: [n, p.domainX[1]] })} />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>X max</FieldLabel>
            <NumericInput value={p.domainX[1]} onChange={(n) => updatePlot({ domainX: [p.domainX[0], n] })} />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Y min</FieldLabel>
            <NumericInput value={p.domainY[0]} onChange={(n) => updatePlot({ domainY: [n, p.domainY[1]] })} />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Y max</FieldLabel>
            <NumericInput value={p.domainY[1]} onChange={(n) => updatePlot({ domainY: [p.domainY[0], n] })} />
          </FieldGroup>
        </FieldRow>
        <FieldGroup>
          <FieldLabel>Amostras</FieldLabel>
          <NumericInput
            value={p.samples}
            onChange={(n) => updatePlot({ samples: Math.max(5, Math.round(n)) })}
            placeholder="25"
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Estilo 3D</FieldLabel>
          <div className="flex gap-1.5">
            {(['surf', 'mesh', 'contour'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updatePlot({ plotStyle: s })}
                className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                  p.plotStyle === s
                    ? 'bg-accent-500/20 border-accent-500/40 text-accent-200'
                    : 'bg-black/20 border-white/[0.08] text-accent-400/60 hover:text-accent-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Colormap</FieldLabel>
          <select
            value={p.colormap}
            onChange={(e) => updatePlot({ colormap: e.target.value as FunctionPlot3D['colormap'] })}
            className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-accent-100 focus:outline-none focus:border-accent-500/40"
          >
            {['viridis', 'hot', 'cool', 'spring', 'winter', 'jet'].map(cm => (
              <option key={cm} value={cm}>{cm}</option>
            ))}
          </select>
        </FieldGroup>
      </>
    )
  }

  function renderDataFields(p: DataPlot) {
    return (
      <>
        <FieldGroup>
          <FieldLabel>Tipo de grafico</FieldLabel>
          <div className="flex gap-1.5">
            {(['line', 'scatter', 'bar'] as const).map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => updatePlot({ chartType: ct })}
                className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                  p.chartType === ct
                    ? 'bg-accent-500/20 border-accent-500/40 text-accent-200'
                    : 'bg-black/20 border-white/[0.08] text-accent-400/60 hover:text-accent-300'
                }`}
              >
                {ct === 'line' ? 'Linha' : ct === 'scatter' ? 'Dispersao' : 'Barras'}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup>
          <FieldLabel>Dados CSV</FieldLabel>
          <textarea
            value={p.data}
            onChange={(e) => updatePlot({ data: e.target.value })}
            placeholder="x, y&#10;0, 0&#10;1, 1&#10;2, 4"
            rows={6}
            className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-accent-100 placeholder:text-accent-400/30 focus:outline-none focus:border-accent-500/40 font-mono resize-none"
          />
        </FieldGroup>
        <FieldRow>
          <FieldGroup>
            <FieldLabel>Coluna X</FieldLabel>
            <FieldInput
              value={p.xColumn}
              onChange={(v) => updatePlot({ xColumn: v })}
              placeholder="x"
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Coluna Y</FieldLabel>
            <FieldInput
              value={p.yColumn}
              onChange={(v) => updatePlot({ yColumn: v })}
              placeholder="y"
            />
          </FieldGroup>
        </FieldRow>
        <FieldGroup>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={p.hasHeader}
              onChange={(e) => updatePlot({ hasHeader: e.target.checked })}
              className="accent-accent-500"
            />
            <FieldLabel>Dados possuem cabecalho</FieldLabel>
          </div>
        </FieldGroup>
      </>
    )
  }

  function renderPlotFields() {
    switch (plot.type) {
      case 'function2d': return renderFunction2DFields(plot)
      case 'function3d': return renderFunction3DFields(plot)
      case 'data': return renderDataFields(plot)
    }
  }

  /* ── Line style toggles ── */

  const lineStyles: { value: 'solid' | 'dashed' | 'dotted'; label: string }[] = [
    { value: 'solid', label: 'Solido' },
    { value: 'dashed', label: 'Tracejado' },
    { value: 'dotted', label: 'Pontilhado' },
  ]

  const marks: { value: PlotSeries['mark']; label: string }[] = [
    { value: 'none', label: 'Nenhum' },
    { value: '*', label: '*' },
    { value: 'o', label: 'o' },
    { value: 'x', label: 'x' },
    { value: '+', label: '+' },
    { value: 'square', label: 'Quadrado' },
    { value: 'triangle', label: 'Triangulo' },
    { value: 'diamond', label: 'Losango' },
  ]

  return (
    <div className="max-h-[500px] overflow-y-auto flex flex-col gap-3">
      {/* Plot-specific fields */}
      {renderPlotFields()}

      {/* ── Common fields ── */}
      <div className="border-t border-white/[0.06] pt-3 mt-1 flex flex-col gap-3">
        <FieldGroup>
          <FieldLabel>Legenda</FieldLabel>
          <FieldInput
            value={plot.legendEntry}
            onChange={(v) => updatePlot({ legendEntry: v })}
            placeholder="$f(x) = x^2$"
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>Cor</FieldLabel>
          <ColorPicker value={plot.color} onChange={(c) => updatePlot({ color: c })} />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>Espessura da linha</FieldLabel>
          <NumericInput
            value={plot.lineWidth}
            onChange={(n) => updatePlot({ lineWidth: n })}
            placeholder="1.5"
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>Estilo da linha</FieldLabel>
          <div className="flex gap-1.5">
            {lineStyles.map((ls) => (
              <button
                key={ls.value}
                type="button"
                onClick={() => updatePlot({ lineStyle: ls.value })}
                className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                  plot.lineStyle === ls.value
                    ? 'bg-accent-500/20 border-accent-500/40 text-accent-200'
                    : 'bg-black/20 border-white/[0.08] text-accent-400/60 hover:text-accent-300'
                }`}
              >
                {ls.label}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>Marcador</FieldLabel>
          <select
            value={plot.mark}
            onChange={(e) => updatePlot({ mark: e.target.value as PlotSeries['mark'] })}
            className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-accent-100 focus:outline-none focus:border-accent-500/40"
          >
            {marks.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FieldGroup>
      </div>

      {/* ── Axis configuration ── */}
      <div className="border-t border-white/[0.06] pt-3 mt-1 flex flex-col gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-400/40">
          Eixos
        </span>

        <FieldGroup>
          <FieldLabel>Titulo</FieldLabel>
          <FieldInput
            value={axis.title}
            onChange={(v) => updateAxis({ title: v })}
            placeholder="Titulo do grafico"
          />
        </FieldGroup>

        <FieldRow>
          <FieldGroup>
            <FieldLabel>Rotulo X</FieldLabel>
            <FieldInput value={axis.xlabel} onChange={(v) => updateAxis({ xlabel: v })} placeholder="$x$" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Rotulo Y</FieldLabel>
            <FieldInput value={axis.ylabel} onChange={(v) => updateAxis({ ylabel: v })} placeholder="$y$" />
          </FieldGroup>
        </FieldRow>

        <FieldGroup>
          <FieldLabel>Grade</FieldLabel>
          <div className="flex gap-1.5">
            {(['none', 'major', 'minor', 'both'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => updateAxis({ grid: g })}
                className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                  axis.grid === g
                    ? 'bg-accent-500/20 border-accent-500/40 text-accent-200'
                    : 'bg-black/20 border-white/[0.08] text-accent-400/60 hover:text-accent-300'
                }`}
              >
                {g === 'none' ? 'Nenhuma' : g}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldRow>
          <FieldGroup>
            <FieldLabel>Largura</FieldLabel>
            <FieldInput value={axis.width} onChange={(v) => updateAxis({ width: v })} placeholder="10cm" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Altura</FieldLabel>
            <FieldInput value={axis.height} onChange={(v) => updateAxis({ height: v })} placeholder="7cm" />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup>
            <FieldLabel>X min</FieldLabel>
            <FieldInput value={axis.xmin} onChange={(v) => updateAxis({ xmin: v })} placeholder="auto" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>X max</FieldLabel>
            <FieldInput value={axis.xmax} onChange={(v) => updateAxis({ xmax: v })} placeholder="auto" />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup>
            <FieldLabel>Y min</FieldLabel>
            <FieldInput value={axis.ymin} onChange={(v) => updateAxis({ ymin: v })} placeholder="auto" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Y max</FieldLabel>
            <FieldInput value={axis.ymax} onChange={(v) => updateAxis({ ymax: v })} placeholder="auto" />
          </FieldGroup>
        </FieldRow>
      </div>
    </div>
  )
}
