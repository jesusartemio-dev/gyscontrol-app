// Totales de una importación ANTES de confirmarla.
//
// Existe porque el monto que la IA lee de la hoja "RESUMEN ECONÓMICO" (o del PDF)
// y la suma de los ítems que realmente se importan son dos números de distinta
// procedencia, y pueden no coincidir: el Excel de costeo es una plantilla con
// hojas de otros alcances que no forman parte de la propuesta. Sin comparar
// ambos, el descuadre recién se ve con la cotización ya creada.
//
// El cálculo replica a propósito el de POST /api/agente/importar-excel/confirmar:
// si ese cambia, este tiene que cambiar igual o el aviso mentiría.

import type {
  ExcelExtraido,
  ExcelEquipoGrupo,
  ExcelServicioGrupo,
  ExcelGastoGrupo,
} from './excelExtractor'

export interface TotalesImportacion {
  equipos: number
  servicios: number
  gastos: number
  total: number
}

export type Seccion = 'equipos' | 'servicios' | 'gastos'

/** Exclusiones por clave: "equipos-0" para un grupo, "equipos-0-3" para un ítem. */
export type Exclusiones = Record<string, boolean>

export function totalGrupoEquipos(grupo: ExcelEquipoGrupo, gi?: number, excluidos: Exclusiones = {}): number {
  return grupo.items.reduce(
    (s, i, ii) => (gi !== undefined && excluidos[`equipos-${gi}-${ii}`] ? s : s + i.precioCliente * i.cantidad),
    0
  )
}

export function totalGrupoGastos(grupo: ExcelGastoGrupo, gi?: number, excluidos: Exclusiones = {}): number {
  return grupo.items.reduce(
    (s, i, ii) => (gi !== undefined && excluidos[`gastos-${gi}-${ii}`] ? s : s + i.costoCliente),
    0
  )
}

/**
 * Objetivo por sección leído del cuadro resumen del PDF. Las líneas comerciales
 * ("SUMINISTRO DE EQUIPOS…", "SERVICIO…", "GASTOS…") son la referencia real:
 * el Excel de costeo está desagregado de otra forma y no cuadra por hoja.
 */
export function seccionDePartida(descripcion: string): Seccion {
  const t = descripcion.toLowerCase()
  if (/gasto|movilizaci|vi[aá]tico|administrativ|indirecto/.test(t)) return 'gastos'
  if (/servicio|migraci|instalaci|ingenier|programaci|mano de obra|supervisi|soporte/.test(t)) {
    return 'servicios'
  }
  return 'equipos'
}

export function objetivosDesdePdf(
  partidas: Array<{ descripcion: string; monto: number }>,
  asignacion: Record<number, Seccion> = {}
): Record<Seccion, number> | null {
  if (partidas.length === 0) return null
  const objetivos: Record<Seccion, number> = { equipos: 0, servicios: 0, gastos: 0 }
  partidas.forEach((p, i) => {
    objetivos[asignacion[i] ?? seccionDePartida(p.descripcion)] += p.monto
  })
  return {
    equipos: redondear(objetivos.equipos),
    servicios: redondear(objetivos.servicios),
    gastos: redondear(objetivos.gastos),
  }
}

/**
 * Solo cuenta lo que el endpoint va a crear: los grupos sin EDT mapeado y los
 * recursos sin mapear se descartan en silencio al importar.
 */
export function totalGrupoServicios(
  grupo: ExcelServicioGrupo,
  recursoMappings: Record<string, string>,
  edtMappings: Record<string, string>,
  gi?: number,
  excluidos: Exclusiones = {},
  ignorarMapeos = false
): number {
  if (!ignorarMapeos && !edtMappings[grupo.edtSugerido || grupo.grupo]) return 0

  return grupo.actividades.reduce((s, act, ai) => {
    if (gi !== undefined && excluidos[`servicios-${gi}-${ai}`]) return s
    // Antes del paso de Mapeo todavía no hay EDT ni recursos vinculados: ahí se
    // muestra lo extraído, si no la sección aparecería en cero sin explicación.
    if (ignorarMapeos) return s + act.costoCliente
    return (
      s +
      act.recursos.reduce(
        (sr, rec) =>
          recursoMappings[rec.recursoNombre]
            ? sr + rec.horas * rec.costoHora * (grupo.factorSeguridad || 1)
            : sr,
        0
      )
    )
  }, 0)
}

export function calcularTotalesImportacion(
  excel: ExcelExtraido,
  recursoMappings: Record<string, string>,
  edtMappings: Record<string, string>,
  excluidos: Exclusiones = {},
  ajustes: Partial<Record<Seccion, number>> = {},
  ignorarMapeos = false
): TotalesImportacion {
  const equipos =
    excel.equipos.reduce(
      (s, g, i) => (excluidos[`equipos-${i}`] ? s : s + totalGrupoEquipos(g, i, excluidos)),
      0
    ) + (ajustes.equipos || 0)

  const servicios =
    excel.servicios.reduce(
      (s, g, i) =>
        excluidos[`servicios-${i}`]
          ? s
          : s + totalGrupoServicios(g, recursoMappings, edtMappings, i, excluidos, ignorarMapeos),
      0
    ) + (ajustes.servicios || 0)

  const gastos =
    excel.gastos.reduce(
      (s, g, i) => (excluidos[`gastos-${i}`] ? s : s + totalGrupoGastos(g, i, excluidos)),
      0
    ) + (ajustes.gastos || 0)

  return {
    equipos: redondear(equipos),
    servicios: redondear(servicios),
    gastos: redondear(gastos),
    total: redondear(equipos + servicios + gastos),
  }
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}
