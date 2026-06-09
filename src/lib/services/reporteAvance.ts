import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { rangoSemanaIso } from '@/lib/utils/isoWeek'
import { listarRegistrosAvanceDeSemana, obtenerJornadasDeSemana } from './registroAvance'
import type { TipoRegistroAvance } from '@/lib/validators/registroAvance'

// ─── Include helpers ─────────────────────────────────────────────────────────

const REPORTE_AVANCE_INCLUDE = {
  proyecto: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      numeroContrato: true,
      cliente: { select: { id: true, nombre: true, ruc: true } },
      hitos: { orderBy: { orden: 'asc' } },
    },
  },
  autor: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true } },
} as const satisfies Prisma.ReporteSemanalAvanceInclude

export type ReporteAvanceDetalle = Prisma.ReporteSemanalAvanceGetPayload<{
  include: typeof REPORTE_AVANCE_INCLUDE
}>

// ─── Obtener o crear ─────────────────────────────────────────────────────────

/**
 * Si ya existe un reporte para (proyectoId, semanaIso) lo retorna;
 * si no, lo crea en estado `borrador`. fechaInicio/fechaFin desde rangoSemanaIso,
 * fechaCorte = fechaFin (domingo de la semana).
 */
export async function obtenerOCrearReporte(
  proyectoId: string,
  semanaIso: string,
  autorId: string,
): Promise<ReporteAvanceDetalle> {
  const { fechaInicio, fechaFin } = rangoSemanaIso(semanaIso)

  const existing = await prisma.reporteSemanalAvance.findUnique({
    where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
    include: REPORTE_AVANCE_INCLUDE,
  })
  if (existing) return existing

  return prisma.reporteSemanalAvance.create({
    data: {
      proyectoId,
      autorId,
      semanaIso,
      fechaInicio,
      fechaFin,
      fechaCorte: fechaFin,
      // estado por defecto: 'borrador' (default del schema)
    },
    include: REPORTE_AVANCE_INCLUDE,
  })
}

// ─── Tipos del agregado ──────────────────────────────────────────────────────

/** Foto seleccionada para el reporte (solo incluirEnReporte + driveFileId). */
export interface FotoReporte {
  id: string
  driveFileId: string
  nombreArchivo: string
  leyenda: string | null
  orden: number
  registroId: string
  registroTipo: TipoRegistroAvance
  registroDescripcion: string
}

/** Impedimento/restricción consolidada (override del reporte o derivado de bloqueos). */
export interface ImpedimentoAgregado {
  restriccion: string
  responsable: string | null
  fechaLimite: string | null
}

/** Avance por fase (solo % actual; el desglose semanal/acumulado es Fase 2 del roadmap). */
export interface AvanceFase {
  faseId: string
  nombre: string
  porcentajeAvance: number
}

/** Hito con fechas Plan/Pronóstico/Real y el comentario (override del reporte si lo hay). */
export interface HitoReporte {
  id: string
  tipo: 'contractual' | 'intermedio'
  nombre: string
  orden: number
  fechaPlan: Date | null
  fechaPronostico: Date | null
  fechaReal: Date | null
  comentario: string | null
}

export interface VariacionReporte {
  fase: string
  causa: string
}

export interface CabeceraReporte {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    numeroContrato: string | null
    descripcion: string | null
  }
  cliente: { id: string; nombre: string; ruc: string | null } | null
  numero: number | null
  semanaIso: string
  fechaInicio: Date
  fechaFin: Date
  fechaCorte: Date
  estado: ReporteAvanceDetalle['estado']
  nombreArchivo: string
}

export interface ReporteAvanceAgregado {
  reporte: ReporteAvanceDetalle
  cabecera: CabeceraReporte
  registros: Awaited<ReturnType<typeof listarRegistrosAvanceDeSemana>>
  jornadas: Awaited<ReturnType<typeof obtenerJornadasDeSemana>>
  fotos: FotoReporte[]
  impedimentos: ImpedimentoAgregado[]
  avancePorFase: AvanceFase[]
  hitos: HitoReporte[]
  variaciones: VariacionReporte[]
}

// ─── Parsers defensivos de los campos Json ───────────────────────────────────

function toRecordArray(json: Prisma.JsonValue | null): Record<string, unknown>[] {
  if (!Array.isArray(json)) return []
  const out: Record<string, unknown>[] = []
  for (const x of json) {
    if (typeof x === 'object' && x !== null && !Array.isArray(x)) {
      out.push(x as Record<string, unknown>)
    }
  }
  return out
}

function parseImpedimentos(json: Prisma.JsonValue | null): ImpedimentoAgregado[] {
  return toRecordArray(json)
    .filter((x) => typeof x.restriccion === 'string' && (x.restriccion as string).trim() !== '')
    .map((x) => ({
      restriccion: String(x.restriccion).trim(),
      responsable: typeof x.responsable === 'string' ? x.responsable : null,
      fechaLimite: typeof x.fechaLimite === 'string' ? x.fechaLimite : null,
    }))
}

function parseVariaciones(json: Prisma.JsonValue | null): VariacionReporte[] {
  return toRecordArray(json)
    .filter((x) => typeof x.fase === 'string' || typeof x.causa === 'string')
    .map((x) => ({
      fase: typeof x.fase === 'string' ? x.fase : '',
      causa: typeof x.causa === 'string' ? x.causa : '',
    }))
}

function parseComentariosHitos(json: Prisma.JsonValue | null): Map<string, string> {
  const map = new Map<string, string>()
  for (const x of toRecordArray(json)) {
    if (typeof x.hitoId === 'string' && typeof x.comentario === 'string') {
      map.set(x.hitoId, x.comentario)
    }
  }
  return map
}

/** Deriva impedimentos desde los bloqueos (Json) de las jornadas de la semana. */
function impedimentosDesdeBloqueos(
  jornadas: Awaited<ReturnType<typeof obtenerJornadasDeSemana>>,
): ImpedimentoAgregado[] {
  const out: ImpedimentoAgregado[] = []
  const vistos = new Set<string>()
  for (const j of jornadas) {
    for (const b of toRecordArray(j.bloqueos)) {
      const restriccion = typeof b.descripcion === 'string' ? b.descripcion.trim() : ''
      if (!restriccion) continue
      const key = restriccion.toLowerCase()
      if (vistos.has(key)) continue // dedup por descripción
      vistos.add(key)
      out.push({ restriccion, responsable: null, fechaLimite: null })
    }
  }
  return out
}

// ─── Datos agregados ─────────────────────────────────────────────────────────

export async function obtenerReporteAvanceAgregado(
  reporteId: string,
): Promise<ReporteAvanceAgregado | null> {
  const reporte = await prisma.reporteSemanalAvance.findUnique({
    where: { id: reporteId },
    include: REPORTE_AVANCE_INCLUDE,
  })
  if (!reporte) return null

  const { proyectoId, fechaInicio, fechaFin } = reporte

  const [registros, jornadas] = await Promise.all([
    listarRegistrosAvanceDeSemana(proyectoId, fechaInicio, fechaFin),
    obtenerJornadasDeSemana(proyectoId, fechaInicio, fechaFin),
  ])

  // ── Fotos del reporte ──
  // registros llegan ordenados (createdAt asc) y sus fotos por orden asc; al recorrer
  // en ese orden conservamos el orden (registro, orden) requerido.
  const fotos: FotoReporte[] = []
  for (const r of registros) {
    for (const f of r.fotos) {
      if (f.incluirEnReporte && f.driveFileId) {
        fotos.push({
          id: f.id,
          driveFileId: f.driveFileId,
          nombreArchivo: f.nombreArchivo,
          leyenda: f.leyenda,
          orden: f.orden,
          registroId: r.id,
          registroTipo: r.tipo,
          registroDescripcion: r.descripcion,
        })
      }
    }
  }

  // ── Impedimentos: override guardado o derivado de bloqueos ──
  const impedimentosGuardados = parseImpedimentos(reporte.impedimentos)
  const impedimentos =
    impedimentosGuardados.length > 0 ? impedimentosGuardados : impedimentosDesdeBloqueos(jornadas)

  // ── Avance por fase (solo % actual) ──
  // Se prioriza el cronograma de ejecución (vigente); si no hay, todas las fases del proyecto.
  const cronogramaEjec = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId, tipo: 'ejecucion' },
    select: { id: true },
  })
  const fases = await prisma.proyectoFase.findMany({
    where: cronogramaEjec ? { proyectoCronogramaId: cronogramaEjec.id } : { proyectoId },
    select: { id: true, nombre: true, porcentajeAvance: true },
    orderBy: { orden: 'asc' },
  })
  const avancePorFase: AvanceFase[] = fases.map((f) => ({
    faseId: f.id,
    nombre: f.nombre,
    porcentajeAvance: f.porcentajeAvance,
  }))

  // ── Hitos del proyecto, aplicando comentariosHitos override ──
  const comentariosOverride = parseComentariosHitos(reporte.comentariosHitos)
  const hitos: HitoReporte[] = reporte.proyecto.hitos.map((h) => ({
    id: h.id,
    tipo: h.tipo,
    nombre: h.nombre,
    orden: h.orden,
    fechaPlan: h.fechaPlan,
    fechaPronostico: h.fechaPronostico,
    fechaReal: h.fechaReal,
    comentario: comentariosOverride.get(h.id) ?? h.comentario,
  }))

  // ── Variaciones guardadas ──
  const variaciones = parseVariaciones(reporte.variaciones)

  // ── Cabecera ──
  const cabecera: CabeceraReporte = {
    proyecto: {
      id: reporte.proyecto.id,
      codigo: reporte.proyecto.codigo,
      nombre: reporte.proyecto.nombre,
      numeroContrato: reporte.proyecto.numeroContrato,
      descripcion: reporte.proyecto.descripcion,
    },
    cliente: reporte.proyecto.cliente
      ? {
          id: reporte.proyecto.cliente.id,
          nombre: reporte.proyecto.cliente.nombre,
          ruc: reporte.proyecto.cliente.ruc,
        }
      : null,
    numero: reporte.numero,
    semanaIso: reporte.semanaIso,
    fechaInicio: reporte.fechaInicio,
    fechaFin: reporte.fechaFin,
    fechaCorte: reporte.fechaCorte,
    estado: reporte.estado,
    nombreArchivo: `Reporte_Avance_${reporte.semanaIso}_${reporte.proyecto.codigo}.xlsx`,
  }

  return {
    reporte,
    cabecera,
    registros,
    jornadas,
    fotos,
    impedimentos,
    avancePorFase,
    hitos,
    variaciones,
  }
}

export { REPORTE_AVANCE_INCLUDE }
