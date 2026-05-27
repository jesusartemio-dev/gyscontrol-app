import { z } from 'zod'

export const mesParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Formato inválido (ej. 2026-05)')
  .refine(
    (s) => {
      const month = Number(s.slice(5, 7))
      return month >= 1 && month <= 12
    },
    'Mes debe estar entre 01 y 12',
  )

export type MesParam = z.infer<typeof mesParamSchema>

export interface KpisMensuales {
  hht: number
  hhtAcumulado: number
  personalUnico: number
  jornadasTotal: number
  jornadasAprobadas: number
  jornadasPendientes: number
  jornadasRechazadas: number
  jornadasIniciadas: number
  jornadasConEvidencia: number
  jornadasSinEvidencia: number
  charlasCount: number
  inspeccionesCount: number
  observacionesCount: number
  incidentesCount: number
  riesgoCriticoCount: number
  medioAmbienteCount: number
  prevencionSaludCount: number
  actividadGeneralCount: number
  asistentesCharlas: number
  entregasEppCount: number
  fotosCount: number
  diasSinAccidentes: number
}

export interface PersonalMes {
  usuario: { id: string; name: string | null; email: string }
  totalHoras: number
  jornadasCount: number
  rol?: string
}

export interface ResumenJornadas {
  total: number
  aprobadas: number
  pendientes: number
  rechazadas: number
  iniciadas: number
  conEvidencia: number
  sinEvidencia: number
}
