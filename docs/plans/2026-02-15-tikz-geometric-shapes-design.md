# Design: Figuras Geométricas com TikZ

**Data:** 2026-02-15
**Status:** Aprovado

## Objetivo

Permitir que usuários criem figuras geométricas (círculos, quadrados, triângulos, retângulos, polígonos regulares e personalizados) via interface visual, gerando código TikZ automaticamente.

## Decisões de Design

- **Interação:** Formulário/painel (não canvas drag-and-drop)
- **Composição:** Múltiplas formas por figura TikZ
- **Propriedades:** Avançadas (cor, borda, espessura, estilo de linha, opacidade, rotação, sombra, rótulo)
- **Polígonos:** Regulares (nº de lados + raio) e personalizados (lista de vértices)
- **Preview:** SVG em tempo real no modal
- **Abordagem:** Modal dedicado (padrão similar aos math-editors)

## Arquitetura

### Componentes

1. **`TikzShapeEditor`** — Modal com 3 painéis:
   - Esquerda: lista de formas adicionadas
   - Centro: formulário de configuração da forma selecionada
   - Direita: preview SVG em tempo real

2. **`TikzFigureBlock`** — Extensão TipTap (node type `tikzFigure`), armazena shapes como JSON nos attrs. Renderiza preview SVG inline no editor.

3. **`tikzGenerator.ts`** — Funções puras que convertem `TikzShape[]` → código TikZ.

4. **`TikzPreview.tsx`** — Componente React que renderiza `TikzShape[]` como SVG.

5. **Integração** — Slash command `/tikz`, BlockInsertMenu, clique em bloco existente.

### Modelo de Dados

```typescript
interface TikzShapeBase {
  id: string
  type: ShapeType
  position: { x: number; y: number }
  fill?: string          // Cor TikZ (ex: "blue!30")
  stroke?: string        // Cor da borda
  lineWidth?: number     // Espessura em pt
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  opacity?: number       // 0 a 1
  rotation?: number      // Graus
  shadow?: boolean
  label?: string
}

interface TikzCircle extends TikzShapeBase {
  type: 'circle'
  radius: number
}

interface TikzRectangle extends TikzShapeBase {
  type: 'rectangle'
  width: number
  height: number
}

interface TikzSquare extends TikzShapeBase {
  type: 'square'
  side: number
}

interface TikzTriangle extends TikzShapeBase {
  type: 'triangle'
  base: number
  height: number
}

interface TikzRegularPolygon extends TikzShapeBase {
  type: 'regular-polygon'
  sides: number
  radius: number
}

interface TikzCustomPolygon extends TikzShapeBase {
  type: 'custom-polygon'
  vertices: { x: number; y: number }[]
}

type TikzShape = TikzCircle | TikzRectangle | TikzSquare
  | TikzTriangle | TikzRegularPolygon | TikzCustomPolygon
```

O node TipTap `tikzFigure` armazena `{ shapes: TikzShape[] }` como atributo JSON.

## UI do Modal

```
┌─────────────────────────────────────────────────────────┐
│  Construtor de Figuras TikZ                         [X] │
├──────────┬──────────────────────┬───────────────────────┤
│ FORMAS   │ CONFIGURAÇÃO         │ PREVIEW               │
│          │                      │                       │
│ ○ Círc.1 │ Tipo: [Círculo ▼]   │   ┌──────────────┐   │
│ □ Ret.1  │                      │   │              │   │
│ △ Tri.1  │ Posição:  X[2] Y[3] │   │    ◯         │   │
│          │ Raio:     [1.5]     │   │   ┌──┐       │   │
│ [+ Forma]│                      │   │   │  │  △    │   │
│          │ Preenchimento: [...]  │   │   └──┘       │   │
│          │ Borda:   [...]       │   │              │   │
│          │ Espessura: [0.4]    │   └──────────────┘   │
│          │ Estilo: ○sol ○tra ○pt│                       │
│          │ Opacidade: [===--]  │   Grid: [✓]          │
│          │ Rotação:  [0°]      │   Zoom: [- 100% +]   │
│          │ Sombra:   [  ]      │                       │
│          │ Rótulo:   [...]     │                       │
├──────────┴──────────────────────┴───────────────────────┤
│                     [Excluir] [Cancelar] [Inserir]      │
└─────────────────────────────────────────────────────────┘
```

**Painel Esquerda:** Lista de formas, ícone do tipo, botão "+ Forma".

**Painel Central:** Campos dinâmicos por tipo + campos comuns (posição, cores, estilo, opacidade, rotação, sombra, rótulo).

**Painel Direita:** Canvas SVG com grid opcional, zoom, forma selecionada destacada.

## Geração de TikZ

Exemplos de output:

```latex
\begin{tikzpicture}
  \draw[fill=blue!30, draw=red, line width=0.8pt] (2,3) circle (1.5cm);
  \draw[fill=green!20, dashed] (0,0) rectangle (3,2);
  \draw[fill=yellow!40] (1,0) -- (2,2) -- (3,0) -- cycle;
  \node[regular polygon, regular polygon sides=6, minimum size=2cm,
        draw, fill=orange!20] at (5,3) {};
  \draw[fill=purple!15] (0,0) -- (1,2) -- (3,1.5) -- (2.5,-0.5) -- cycle;
\end{tikzpicture}
```

Mapeamento de propriedades:
- `fill` → `fill=<cor>`
- `stroke` → `draw=<cor>`
- `lineWidth` → `line width=<n>pt`
- `lineStyle` → `dashed` / `dotted`
- `opacity` → `opacity=<n>`
- `rotation` → `rotate=<n>`
- `shadow` → `drop shadow`
- `label` → `node` no centro

## Preview SVG

Componente `TikzPreview.tsx` mapeia `TikzShape[]` para SVG:
- `circle` → `<circle>`
- `rectangle`/`square` → `<rect>`
- `triangle`/polígonos → `<polygon>`
- Cores TikZ convertidas via `tikzColorToCSS()` (ex: `blue!30` → `rgba(0,0,255,0.3)`)

Fidelidade alta para formas geométricas. Discrepâncias menores aceitáveis — o preview de PDF no RightPanel mostra o resultado real.

## Integração com o Editor

### Extensão TipTap

- Node type: `tikzFigure`, atom: true
- Attrs: `{ shapes: TikzShape[] }`
- NodeView: Preview SVG compacto inline
- Click/double-click: Abre modal para edição

### Acesso

- Slash command: `/tikz`, `/figura` (aliases: `geometria`, `desenho`, `forma`)
- BlockInsertMenu: Categoria "Figuras" → "Figura TikZ"

### Round-trip LaTeX

- `generateLatex.ts`: `tikzFigure` → `\begin{tikzpicture}...\end{tikzpicture}`
- `parseLatex.ts`: Tenta parsear `\begin{tikzpicture}` de volta para `TikzShape[]`. Se contiver comandos não reconhecidos, fallback para `rawLatex`.

### Estado no App.tsx

```typescript
tikzEdit: {
  shapes: TikzShape[]
  pos: number
  mode: 'insert' | 'edit'
} | null
```

## Fora de Escopo (v1)

- Drag-and-drop no canvas
- Reordenação de formas por arrastar na lista
- Snap-to-grid no posicionamento
- Curvas e arcos
- Setas e linhas conectoras
- Agrupamento de formas
