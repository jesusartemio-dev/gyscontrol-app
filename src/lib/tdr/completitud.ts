import type {
  TdrAnalisisCore,
  BloqueId,
  BloquesCompletitud,
  EstadoBloque,
} from '@/types/tdr'

const tieneItems = <T>(v: T[] | null | undefined): boolean =>
  Array.isArray(v) && v.length > 0

const tieneTexto = (v: string | null | undefined): boolean =>
  typeof v === 'string' && v.trim().length > 0

export function calcularEstadoBloque(
  bloque: BloqueId,
  d: TdrAnalisisCore,
): EstadoBloque {
  switch (bloque) {
    case 'identificacion': {
      const campos = [d.clienteDetectado, d.proyectoDetectado, d.ubicacionDetectada]
      const llenos = campos.filter(tieneTexto).length
      if (llenos === 3) return 'completo'
      if (llenos > 0) return 'parcial'
      return 'vacio'
    }
    case 'alcance': {
      const tieneResumen = tieneTexto(d.resumenTdr)
      const tieneAlcance = tieneTexto(d.alcanceDetectado)
      const tieneReqs = tieneItems(d.requerimientos)
      if (tieneResumen && tieneAlcance && tieneReqs) return 'completo'
      if (tieneResumen || tieneReqs) return 'parcial'
      return 'vacio'
    }
    case 'suministros': {
      const tieneEquipos = tieneItems(d.equiposIdentificados)
      const tieneServicios = tieneItems(d.serviciosIdentificados)
      if (tieneEquipos && tieneServicios) return 'completo'
      if (tieneEquipos || tieneServicios) return 'parcial'
      return 'vacio'
    }
    case 'personal': {
      if (!tieneItems(d.personalRequerido)) return 'vacio'
      const conDetalle = (d.personalRequerido ?? []).some(
        p => p.experienciaAnios != null || (p.certificaciones?.length ?? 0) > 0,
      )
      return conDetalle ? 'completo' : 'parcial'
    }
    case 'plazos': {
      const tieneCrono = tieneItems(d.cronogramaEstimado)
      const tieneHitos = tieneItems(d.hitosContractuales)
      if (tieneCrono && tieneHitos) return 'completo'
      if (tieneCrono || tieneHitos) return 'parcial'
      return 'vacio'
    }
    case 'ssoma': {
      const tieneNormas = tieneItems(d.normasAplicables)
      const tieneDocs = tieneItems(d.documentosPrevios)
      if (tieneNormas && tieneDocs) return 'completo'
      if (tieneNormas || tieneDocs) return 'parcial'
      return 'vacio'
    }
    case 'comercial': {
      const tienePresupuesto = d.presupuestoEstimado != null
      const tienePenalidades = tieneItems(d.penalidades)
      const tieneGarantias = d.garantias != null
      if (tienePresupuesto && (tienePenalidades || tieneGarantias)) return 'completo'
      if (tienePresupuesto || tienePenalidades || tieneGarantias) return 'parcial'
      return 'vacio'
    }
    case 'entregables': {
      if (!tieneItems(d.entregablesDossier)) return 'vacio'
      const fases = new Set((d.entregablesDossier ?? []).map(e => e.fase))
      return fases.size >= 2 ? 'completo' : 'parcial'
    }
  }
}

export function calcularCompletitudGeneral(d: TdrAnalisisCore): {
  porcentaje: number
  bloquesCompletos: number
  totalBloques: number
  bloques: BloquesCompletitud
} {
  const bloqueIds: BloqueId[] = [
    'identificacion', 'alcance', 'suministros', 'personal',
    'plazos', 'ssoma', 'comercial', 'entregables',
  ]
  const bloques = Object.fromEntries(
    bloqueIds.map(id => [id, calcularEstadoBloque(id, d)]),
  ) as BloquesCompletitud

  const completos = Object.values(bloques).filter(e => e === 'completo').length
  const parciales = Object.values(bloques).filter(e => e === 'parcial').length
  const porcentaje = Math.round(((completos + parciales * 0.5) / 8) * 100)

  return {
    porcentaje,
    bloquesCompletos: completos,
    totalBloques: 8,
    bloques,
  }
}
