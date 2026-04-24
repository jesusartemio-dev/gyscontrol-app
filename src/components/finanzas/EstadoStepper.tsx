'use client'

import StatusStepper, { type StatusStep, type StepStatus } from '@/components/ui/status-stepper'

const STEPS_CON_ANTICIPO = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'depositado', label: 'Depositado' },
  { key: 'rendido', label: 'Rendido' },
  { key: 'revisado', label: 'Revisado' },
  { key: 'validado', label: 'Validado' },
  { key: 'cerrado', label: 'Cerrado' },
]

const STEPS_SIN_ANTICIPO = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'rendido', label: 'Rendido' },
  { key: 'revisado', label: 'Revisado' },
  { key: 'validado', label: 'Validado' },
  { key: 'cerrado', label: 'Cerrado' },
]

interface EstadoStepperProps {
  estado: string
  requiereAnticipo: boolean
  rechazadoEn?: string | null
}

export default function EstadoStepper({ estado, requiereAnticipo, rechazadoEn }: EstadoStepperProps) {
  const stepsConfig = requiereAnticipo ? STEPS_CON_ANTICIPO : STEPS_SIN_ANTICIPO
  const isRechazado = estado === 'rechazado'

  const currentIndex = isRechazado
    ? stepsConfig.findIndex(s => {
        if (rechazadoEn === 'aprobacion') return s.key === 'enviado'
        if (rechazadoEn === 'revision') return s.key === 'rendido'
        if (rechazadoEn === 'validacion') return s.key === 'revisado'
        if (rechazadoEn === 'cierre') return s.key === 'validado'
        return s.key === 'enviado'
      })
    : stepsConfig.findIndex(s => s.key === estado)

  const steps: StatusStep[] = stepsConfig.map((step, i) => {
    let status: StepStatus = 'future'

    if (isRechazado) {
      if (i < currentIndex) status = 'completed'
      else if (i === currentIndex) status = 'rejected'
    } else {
      if (i < currentIndex) status = 'completed'
      else if (i === currentIndex) status = 'current'
    }

    return {
      key: step.key,
      label: isRechazado && i === currentIndex ? 'Rechazado' : step.label,
      status,
    }
  })

  return <StatusStepper steps={steps} />
}
