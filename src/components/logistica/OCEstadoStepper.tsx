'use client'

import { CheckCircle, Circle, XCircle } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'aprobada', label: 'Aprobada' },
  { key: 'enviada', label: 'Enviada' },
  { key: 'confirmada', label: 'Confirmada' },
  { key: 'completada', label: 'Completada' },
]

interface OCEstadoStepperProps {
  estado: string
}

export default function OCEstadoStepper({ estado }: OCEstadoStepperProps) {
  const isCancelled = estado === 'cancelada'
  const isParcial = estado === 'parcial'

  // For parcial, highlight up to confirmada
  const currentIndex = isParcial
    ? STEPS.findIndex(s => s.key === 'confirmada')
    : STEPS.findIndex(s => s.key === estado)

  // For cancelled, find the last completed step
  const cancelledIndex = isCancelled ? 0 : -1

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((step, i) => {
        const isCompleted = !isCancelled && currentIndex > i
        const isCurrent = currentIndex === i
        const isCancelledStep = isCancelled && i === cancelledIndex

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div className={clsx(
                'w-4 h-px mx-0.5',
                isCompleted ? 'bg-emerald-400' : 'bg-gray-200'
              )} />
            )}
            <div className="flex items-center gap-1" title={step.label}>
              {isCancelledStep ? (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              ) : isCompleted ? (
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : isCurrent ? (
                <Circle className={clsx(
                  'h-4 w-4 flex-shrink-0',
                  isParcial ? 'text-orange-500 fill-orange-100' : 'text-blue-500 fill-blue-100'
                )} />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
              <span className={clsx(
                'text-[10px] whitespace-nowrap',
                isCancelledStep ? 'text-red-600 font-semibold' :
                isCompleted ? 'text-emerald-700' :
                isCurrent && isParcial ? 'text-orange-700 font-semibold' :
                isCurrent ? 'text-blue-700 font-semibold' :
                'text-gray-400'
              )}>
                {isCancelledStep ? 'Cancelada' : isParcial && isCurrent ? 'Parcial' : step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
