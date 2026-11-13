import type { Iperc, IpercFila as IpercFilaPrisma, IpercGeneracion } from '@prisma/client'

/**
 * La fila como la devuelve la API: el modelo mas quien la dio por revisada.
 *
 * `revisadaPor` es una relacion, asi que no viene en el tipo de Prisma pero
 * si en la respuesta, porque la consulta la incluye.
 */
export type IpercFila = IpercFilaPrisma & {
  revisadaPor?: { name: string | null } | null
}

export type { Iperc, IpercGeneracion }

// ─── Estado del IPERC ───────────────────────────────────────────────────────
export type IpercEstado = 'borrador' | 'revisado' | 'aprobado'

// ─── Evaluador ──────────────────────────────────────────────────────────────
export interface IpercEvaluador {
  nombre: string
  cargo: string
}

// ─── Fila como se representa en el cliente (id incluido) ────────────────────
export interface IpercFilaRow {
  id: string
  numero: number
  proceso: string
  actividad: string
  tarea: string
  puestoTrabajo: string
  factorRiesgo: string
  condicionActividad: string
  peligro: string
  riesgo: string
  consecuencia: string
  severidad: number
  probabilidad: string
  eliminar: string
  sustituir: string
  controlIngenieria: string
  controlAdministrativo: string
  controlReceptor: string
  severidadResidual: number
  probabilidadResidual: string
  accionesMejora: string
  responsables: string
  tareaCronogramaRefId: string | null
  actividadCronogramaRefId: string | null
  /** De dónde salió cada control: { campo: [{ texto, origen }] }. */
  origenControles?: unknown
  /** Cuándo el ingeniero de seguridad dio por revisada la línea. Solo en la app. */
  revisadaEn?: string | Date | null
  revisadaPorId?: string | null
  revisadaPor?: { name: string | null } | null
}

// ─── IPERC con filas y generaciones ─────────────────────────────────────────
export interface IpercConRelaciones extends Iperc {
  filas: IpercFila[]
  generaciones: IpercGeneracion[]
}

export type IpercCompleto = IpercConRelaciones

// ─── Contexto completo para la página IPERC ─────────────────────────────────
export interface IpercContexto {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    clienteNombre: string
  }
  iperc: IpercCompleto | null
  preRequisitos: { cumple: boolean; faltantes: string[] }
  generacionActiva: IpercGeneracion | null
  iaHabilitada: boolean
  ultimaGeneracion: IpercGeneracion | null
}

// ─── Payload para crear fila ─────────────────────────────────────────────────
export interface IpercFilaCreatePayload {
  proceso: string
  actividad: string
  tarea: string
  puestoTrabajo: string
  factorRiesgo: string
  condicionActividad: string
  peligro: string
  riesgo: string
  consecuencia: string
  severidad: number
  probabilidad: string
  eliminar?: string
  sustituir?: string
  controlIngenieria?: string
  controlAdministrativo?: string
  controlReceptor?: string
  severidadResidual: number
  probabilidadResidual: string
  accionesMejora?: string
  responsables?: string
  tareaCronogramaRefId?: string
  actividadCronogramaRefId?: string
}

// ─── Prerequisitos para IPERC ────────────────────────────────────────────────
export interface IpercPrerequisitos {
  cumple: boolean
  faltantes: string[]
}
