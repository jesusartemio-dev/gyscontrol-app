import type { PlanTrabajo, Cliente, Proyecto } from '@prisma/client'

export interface ValidacionExport {
  ok: boolean
  errores: string[]
  advertencias: string[]
}

interface InputValidar {
  plan: PlanTrabajo
  proyecto: Proyecto & { cliente: Cliente | null }
}

export function validarParaExportar({ plan, proyecto }: InputValidar): ValidacionExport {
  const errores: string[] = []
  const advertencias: string[] = []

  // === ERRORES (bloquean exportación) ===

  if (!proyecto.cliente) {
    errores.push('El proyecto no tiene cliente asignado.')
  }

  if (!plan.codigoDocumento || plan.codigoDocumento.trim() === '') {
    errores.push('Falta el código del documento en la cabecera.')
  }

  if (!plan.numeroRevision || plan.numeroRevision.trim() === '') {
    errores.push('Falta el número de revisión en la cabecera.')
  }

  if (!plan.preparadoPor || plan.preparadoPor.trim() === '') {
    errores.push("Falta 'Preparado por' en la cabecera.")
  }

  // === ADVERTENCIAS (no bloquean pero avisan) ===

  if (!plan.objetivo || plan.objetivo.trim().length < 50) {
    advertencias.push('El objetivo está vacío o es muy corto.')
  }

  if (!plan.alcanceGeneral || plan.alcanceGeneral.trim().length < 50) {
    advertencias.push('El alcance general está vacío o es muy corto.')
  }

  const personal = (plan.personalAsignado as unknown[]) ?? []
  if (!Array.isArray(personal) || personal.length === 0) {
    advertencias.push('No hay personal asignado al proyecto.')
  }

  if (!plan.revisadoPor || plan.revisadoPor.trim() === '') {
    advertencias.push("Falta 'Revisado por' en la cabecera.")
  }

  if (!plan.aprobadoPor || plan.aprobadoPor.trim() === '') {
    advertencias.push("Falta 'Aprobado por' en la cabecera.")
  }

  return { ok: errores.length === 0, errores, advertencias }
}
