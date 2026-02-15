'use client'

import { CheckCircle, Circle, XCircle } from 'lucide-react'
import clsx from 'clsx'

const STEPS_CON_ANTICIPO = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'depositado', label: 'Depositado' },
  { key: 'rendido', label: 'Rendido' },
  { key: 'validado', label: 'Validado' },
  { key: 'cerrado', label: 'Cerrado' },
]

const STEPS_SIN_ANTICIPO = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'rendido', label: 'Rendido' },
  { key: 'validado', label: 'Validado' },
  { key: 'cerrado', label: 'Cerrado' },
]

interface EstadoStepperProps {
  estado: string
  requiereAnticipo: boolean
  rechazadoEn?: string | null
}

export default function EstadoStepper({ estado, requiereAnticipo, rechazadoEn }: EstadoStepperProps) {
  const steps = requiereAnticipo ? STEPS_CON_ANTICIPO : STEPS_SIN_ANTICIPO
  const isRechazado = estado === 'rechazado'

  const currentIndex = isRechazado
    ? steps.findIndex(s => {
        if (rechazadoEn === 'aprobacion') return s.key === 'enviado'
        if (rechazadoEn === 'validacion') return s.key === 'rendido'
        if (rechazadoEn === 'cierre') return s.key === 'validado'
        return s.key === 'enviado'
      })
    : steps.findIndex(s => s.key === estado)

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {steps.map((step, i) => {
        const isCompleted = !isRechazado && currentIndex > i
        const isCurrent = currentIndex === i
        const isRejectedStep = isRechazado && isCurrent

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div className={clsx(
                'w-4 h-px mx-0.5',
                isCompleted ? 'bg-emerald-400' : 'bg-gray-200'
              )} />
            )}
            <div className="flex items-center gap-1" title={step.label}>
              {isRejectedStep ? (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              ) : isCompleted ? (
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : isCurrent ? (
                <Circle className="h-4 w-4 text-blue-500 fill-blue-100 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
              <span className={clsx(
                'text-[10px] whitespace-nowrap',
                isRejectedStep ? 'text-red-600 font-semibold' :
                isCompleted ? 'text-emerald-700' :
                isCurrent ? 'text-blue-700 font-semibold' :
                'text-gray-400'
              )}>
                {isRejectedStep ? 'Rechazado' : step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
