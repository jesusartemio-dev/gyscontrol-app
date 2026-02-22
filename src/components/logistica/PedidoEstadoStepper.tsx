'use client'

import { CheckCircle, Circle, XCircle } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'atendido', label: 'Atendido' },
  { key: 'parcial', label: 'Parcial' },
  { key: 'entregado', label: 'Entregado' },
]

interface PedidoEstadoStepperProps {
  estado: string
}

export default function PedidoEstadoStepper({ estado }: PedidoEstadoStepperProps) {
  if (estado === 'cancelado') {
    return (
      <div className="flex items-center gap-1.5">
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="text-[10px] text-red-600 font-semibold">Cancelado</span>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex(s => s.key === estado)

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((step, i) => {
        const isCompleted = currentIndex > i
        const isCurrent = currentIndex === i

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div className={clsx(
                'w-4 h-px mx-0.5',
                isCompleted ? 'bg-emerald-400' : 'bg-gray-200'
              )} />
            )}
            <div className="flex items-center gap-1" title={step.label}>
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : isCurrent ? (
                <Circle className={clsx(
                  'h-4 w-4 flex-shrink-0',
                  step.key === 'parcial' ? 'text-orange-500 fill-orange-100' : 'text-blue-500 fill-blue-100'
                )} />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
              <span className={clsx(
                'text-[10px] whitespace-nowrap',
                isCompleted ? 'text-emerald-700' :
                isCurrent && step.key === 'parcial' ? 'text-orange-700 font-semibold' :
                isCurrent ? 'text-blue-700 font-semibold' :
                'text-gray-400'
              )}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
