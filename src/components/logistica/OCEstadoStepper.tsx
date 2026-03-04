'use client'

import StatusStepper, { type StatusStep, type StepStatus } from '@/components/ui/status-stepper'

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
  if (estado === 'cancelada') {
    return <StatusStepper steps={[{ key: 'cancelada', label: 'Cancelada', status: 'cancelled' }]} />
  }

  const isParcial = estado === 'parcial'
  const currentIndex = isParcial
    ? STEPS.findIndex(s => s.key === 'confirmada')
    : STEPS.findIndex(s => s.key === estado)

  const steps: StatusStep[] = STEPS.map((step, i) => {
    let status: StepStatus = 'future'
    if (i < currentIndex) status = 'completed'
    else if (i === currentIndex) status = 'current'

    return {
      key: step.key,
      label: isParcial && i === currentIndex ? 'Parcial' : step.label,
      status,
    }
  })

  return <StatusStepper steps={steps} />
}
