import type { TipoCicloSaldo, EstadoSolicitudAusencia, TurnoDia } from '@prisma/client'

export type { TipoCicloSaldo, EstadoSolicitudAusencia, TurnoDia }

// ─── TipoAusencia ────────────────────────────────────────────────────────────

export interface TipoAusenciaDTO {
  id: string
  codigo: string
  nombre: string
  color: string
  descuentaSaldo: boolean
  diasPorDefecto: number | null
  tipoCicloSaldo: TipoCicloSaldo
  requiereDocumento: boolean
  requiereAprobacion: boolean
  requiereAprobacion2: boolean
  diasUmbralAprobacion2: number | null
  aplicaFinDeSemana: boolean
  activo: boolean
  orden: number
  createdAt: Date
  updatedAt: Date
}

// ─── SolicitudAusencia ───────────────────────────────────────────────────────

export interface SolicitudAusenciaDTO {
  id: string
  tipoAusenciaId: string
  tipoAusencia: {
    id: string
    codigo: string
    nombre: string
    color: string
    descuentaSaldo: boolean
    requiereDocumento: boolean
    requiereAprobacion2: boolean
    diasUmbralAprobacion2: number | null
  }
  solicitanteId: string
  solicitante: { id: string; name: string | null; email: string }
  empleadoId: string | null
  fechaInicio: Date
  fechaFin: Date
  turnoInicio: TurnoDia
  turnoFin: TurnoDia
  diasHabiles: number | null
  motivo: string | null
  estado: EstadoSolicitudAusencia
  requiereAsignacionAprobador: boolean
  aprobador1Id: string | null
  aprobador1?: { id: string; name: string | null; email: string } | null
  fechaAprobacion1: Date | null
  aprobador2Id: string | null
  aprobador2?: { id: string; name: string | null; email: string } | null
  fechaAprobacion2: Date | null
  motivoRechazo: string | null
  rechazadoPorId: string | null
  fechaRechazo: Date | null
  adjuntos?: SolicitudAusenciaAdjuntoDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface SolicitudAusenciaAdjuntoDTO {
  id: string
  solicitudAusenciaId: string
  nombreArchivo: string
  urlArchivo: string
  driveFileId: string | null
  tipoArchivo: string | null
  tamano: number | null
  createdAt: Date
}

// ─── SaldoAusencia ──────────────────────────────────────────────────────────

export interface SaldoAusenciaDTO {
  id: string
  userId: string
  tipoAusenciaId: string
  tipoAusencia?: { codigo: string; nombre: string; color: string }
  anio: number
  diasAsignados: number
  diasGozados: number
  diasPendientes: number
  diasDisponibles: number
}

// ─── resolverAprobador result ────────────────────────────────────────────────

export type ResolverAprobador1Result =
  | { aprobador1Id: string; via: 'departamento' | 'proyecto' | 'administracion' }
  | { aprobador1Id: null; requiereAsignacion: true }
