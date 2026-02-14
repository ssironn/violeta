export interface MathTemplate {
  id: string
  label: string
  latex: string
  category: 'basic' | 'calculus' | 'algebra' | 'notation'
}

export const mathTemplates: MathTemplate[] = [
  {
    id: 'fraction',
    label: 'Fração',
    latex: '\\frac{a}{b}',
    category: 'basic',
  },
  {
    id: 'sqrt',
    label: 'Raiz Quadrada',
    latex: '\\sqrt{x}',
    category: 'basic',
  },
  {
    id: 'nthroot',
    label: 'Raiz N-ésima',
    latex: '\\sqrt[n]{x}',
    category: 'basic',
  },
  {
    id: 'superscript',
    label: 'Sobrescrito',
    latex: 'x^{2}',
    category: 'notation',
  },
  {
    id: 'subscript',
    label: 'Subscrito',
    latex: 'x_{i}',
    category: 'notation',
  },
  {
    id: 'integral',
    label: 'Integral',
    latex: '\\displaystyle\\int_{a}^{b} f(x) \\, dx',
    category: 'calculus',
  },
  {
    id: 'sum',
    label: 'Somatório',
    latex: '\\displaystyle\\sum_{i=1}^{n} a_i',
    category: 'calculus',
  },
  {
    id: 'product',
    label: 'Produtório',
    latex: '\\displaystyle\\prod_{i=1}^{n} a_i',
    category: 'calculus',
  },
  {
    id: 'limit',
    label: 'Limite',
    latex: '\\displaystyle\\lim_{x \\to \\infty} f(x)',
    category: 'calculus',
  },
  {
    id: 'matrix2x2',
    label: 'Matriz 2x2',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    category: 'algebra',
  },
  {
    id: 'matrix3x3',
    label: 'Matriz 3x3',
    latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}',
    category: 'algebra',
  },
  {
    id: 'derivative',
    label: 'Derivada',
    latex: '\\frac{d}{dx} f(x)',
    category: 'calculus',
  },
  {
    id: 'partial',
    label: 'Derivada Parcial',
    latex: '\\frac{\\partial f}{\\partial x}',
    category: 'calculus',
  },
  {
    id: 'doubleintegral',
    label: 'Integral Dupla',
    latex: '\\displaystyle\\iint_{D} f(x,y) \\, dA',
    category: 'calculus',
  },
]
