'use client'

import StatusStepper, { type StatusStep } from '@/components/ui/status-stepper'

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
    return <StatusStepper steps={[{ key: 'cancelado', label: 'Cancelado', status: 'cancelled' }]} />
  }

  const currentIndex = STEPS.findIndex(s => s.key === estado)

  const steps: StatusStep[] = STEPS.map((step, i) => ({
    key: step.key,
    label: step.label,
    status: i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'future',
  }))

  return <StatusStepper steps={steps} />
}
