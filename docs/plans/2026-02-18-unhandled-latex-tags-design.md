# Design: Tratamento de Tags LaTeX Não-Tratadas

**Data:** 2026-02-18
**Status:** Aprovado

## Problema

Comandos LaTeX como `\chapter`, `\part`, `\title`, `\author` não são tratados pelo parser. Eles caem no fallback genérico e viram nós `rawLatex` — mostrando o código cru no editor em vez de conteúdo legível.

## Requisitos

- `\chapter` deve renderizar como heading nível 0 (acima de `\section`)
- Comandos com conteúdo legível (`\title{X}`, `\author{X}`, etc.) devem mostrar o conteúdo
- Round-trip seguro: exportação deve preservar o comando original
- Nós `rawLatex` restantes devem ter renderização visual melhorada

## Seção 1: `\chapter` e `\part` como headings

### Parser (`parseLatex.ts`)

- Expandir regex de headings em `parseBlock` (linha ~639):
  ```
  /^\\(part|chapter|section|subsection|subsubsection|paragraph)(\*?)\{/
  ```
- Novo mapa de níveis:
  ```ts
  { part: 0, chapter: 0, section: 1, subsection: 2, subsubsection: 3, paragraph: 4 }
  ```
- Guardar `sourceCommand` no attrs do heading para distinguir `part` de `chapter` na exportação
- Expandir regex em `splitIntoBlocks` (linha ~959) para incluir `part` e `chapter`

### Gerador (`generateLatex.ts`)

- Em `processNode` para `heading`:
  - Se `attrs.sourceCommand` é `chapter` ou `part`, usar o comando original
  - Se `level === 0` sem `sourceCommand`, default para `\chapter`
  - Ajustar array de commands para incluir `\chapter` no nível 0

## Seção 2: CONTENT_DISPLAY_COMMANDS

### Nova categoria no parser inline (`parseLatex.ts`)

```ts
const CONTENT_DISPLAY_COMMANDS = new Set([
  'title', 'author', 'date', 'thanks',
  'textsc',
])
```

- Esses comandos: extraem o `{conteúdo}`, renderizam o conteúdo como nós inline
- Guardam `sourceCommand` como atributo ou mark para reconstrução na exportação
- No gerador: se um nó de texto/parágrafo tem `sourceCommand`, reconstrói `\comando{conteúdo}`

### Diferença de FONT_COMMANDS

`FONT_COMMANDS` perde a informação do comando (conteúdo é extraído sem metadata).
`CONTENT_DISPLAY_COMMANDS` preserva o nome do comando para round-trip.

**Implementação:** Similar a `FONT_COMMANDS` mas os nós resultantes carregam um mark `sourceCommand` com o nome do comando original. Na exportação, esse mark reconstrói o wrapper.

## Seção 3: Renderização visual melhorada do rawLatex

### Mudanças em `RawLatexBlock.ts`

1. **Detecção de tipo de conteúdo:**
   - Math → KaTeX (comportamento atual)
   - Comando com `{arg}` não-math → label com nome do comando + conteúdo formatado
   - Outro → código monospace (fallback atual)

2. **Label dinâmico:** Extrair nome do comando do conteúdo e mostrar como label (ex: "hypersetup" em vez de "LaTeX")

3. **Preview legível:** Para comandos não-math, mostrar o argumento de forma legível

## Arquivos Afetados

- `frontend/src/latex/parseLatex.ts` — Seções 1 e 2
- `frontend/src/latex/generateLatex.ts` — Seções 1 e 2
- `frontend/src/extensions/RawLatexBlock.ts` — Seção 3
- `frontend/src/index.css` — possíveis ajustes de estilo para heading nível 0
