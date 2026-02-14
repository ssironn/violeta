import { detectMathType } from './detectMathType'
import { FractionEditor } from './FractionEditor'
import { IntegralEditor } from './IntegralEditor'
import { DoubleIntegralEditor } from './DoubleIntegralEditor'
import { SumProductEditor } from './SumProductEditor'
import { LimitEditor } from './LimitEditor'
import { RootEditor } from './RootEditor'
import { SuperSubEditor } from './SuperSubEditor'
import { DerivativeEditor } from './DerivativeEditor'
import { MatrixEditor } from './MatrixEditor'
import { GenericEditor } from './GenericEditor'

interface MathEditRouterProps {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
  isInsert?: boolean
}

export function MathEditRouter({ initialLatex, onSave, onDelete, onClose, isInsert }: MathEditRouterProps) {
  const type = detectMathType(initialLatex)
  const shared = { initialLatex, onSave, onDelete, onClose, isInsert }

  switch (type) {
    case 'fraction':
      return <FractionEditor {...shared} />
    case 'integral':
      return <IntegralEditor {...shared} />
    case 'doubleintegral':
      return <DoubleIntegralEditor {...shared} />
    case 'sum':
      return <SumProductEditor {...shared} kind="sum" />
    case 'product':
      return <SumProductEditor {...shared} kind="product" />
    case 'limit':
      return <LimitEditor {...shared} />
    case 'sqrt':
    case 'nthroot':
      return <RootEditor {...shared} />
    case 'superscript':
      return <SuperSubEditor {...shared} kind="superscript" />
    case 'subscript':
      return <SuperSubEditor {...shared} kind="subscript" />
    case 'derivative':
    case 'partial':
      return <DerivativeEditor {...shared} />
    case 'matrix':
      return <MatrixEditor {...shared} />
    case 'generic':
    default:
      return <GenericEditor {...shared} />
  }
}
