'use client'

import StatusStepper, { type StatusStep, type StepStatus } from '@/components/ui/status-stepper'

interface StepDef {
  key: string
  label: string
  description: string
}

const STEPS_CON_ANTICIPO: StepDef[] = [
  { key: 'borrador',   label: 'Borrador',   description: 'Empleado: prepara la solicitud.' },
  { key: 'enviado',    label: 'Enviado',    description: 'Empleado: envía para aprobación.' },
  { key: 'aprobado',   label: 'Aprobado',   description: 'Administración: deposita el anticipo.' },
  { key: 'depositado', label: 'Depositado', description: 'Empleado: rinde sus comprobantes.' },
  { key: 'rendido',    label: 'Rendido',    description: 'Administración: revisa los comprobantes.' },
  { key: 'revisado',   label: 'Revisado',   description: 'Coordinador: valida la conformidad.' },
  { key: 'validado',   label: 'Validado',   description: 'Administración: registra reembolso/devolución y cierra.' },
  { key: 'cerrado',    label: 'Cerrado',    description: 'Hoja cerrada.' },
]

const STEPS_SIN_ANTICIPO: StepDef[] = [
  { key: 'borrador', label: 'Borrador', description: 'Empleado: prepara la solicitud.' },
  { key: 'enviado',  label: 'Enviado',  description: 'Empleado: envía para aprobación.' },
  { key: 'aprobado', label: 'Aprobado', description: 'Empleado: rinde sus comprobantes.' },
  { key: 'rendido',  label: 'Rendido',  description: 'Administración: revisa los comprobantes.' },
  { key: 'revisado', label: 'Revisado', description: 'Coordinador: valida la conformidad.' },
  { key: 'validado', label: 'Validado', description: 'Administración: reembolsa al empleado y cierra.' },
  { key: 'cerrado',  label: 'Cerrado',  description: 'Hoja cerrada.' },
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
      description: isRechazado && i === currentIndex
        ? `Rechazado. Empleado: corregir y reenviar.`
        : step.description,
      status,
    }
  })

  return <StatusStepper steps={steps} />
}
