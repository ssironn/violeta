export interface DocumentConfig {
  documentClass: 'article' | 'report' | 'book'
  fontSize: '10pt' | '11pt' | '12pt'
  paperSize: 'a4paper' | 'letterpaper'
  margin: string
  language: 'brazilian' | 'english' | 'spanish' | 'french' | 'german'
  qedSymbol: '$\\blacksquare$' | '$\\square$' | '$\\diamondsuit$' | 'QED'
  theoremNumbering: 'continuous' | 'by-section'
  extraPackages: string[]
}

export const DEFAULT_DOCUMENT_CONFIG: DocumentConfig = {
  documentClass: 'article',
  fontSize: '12pt',
  paperSize: 'a4paper',
  margin: '2.5cm',
  language: 'brazilian',
  qedSymbol: '$\\blacksquare$',
  theoremNumbering: 'continuous',
  extraPackages: [],
}

export const SUGGESTED_PACKAGES = [
  { name: 'tikz-cd', description: 'Diagramas comutativos' },
  { name: 'listings', description: 'Blocos de código-fonte' },
  { name: 'pgfplots', description: 'Gráficos e plots' },
  { name: 'cancel', description: 'Cancelar termos em equações' },
  { name: 'mathtools', description: 'Extensões do amsmath' },
  { name: 'enumitem', description: 'Personalizar listas' },
  { name: 'tcolorbox', description: 'Caixas coloridas' },
  { name: 'algorithm2e', description: 'Pseudocódigo de algoritmos' },
  { name: 'subcaption', description: 'Sub-figuras e sub-tabelas' },
  { name: 'biblatex', description: 'Referências bibliográficas' },
]
