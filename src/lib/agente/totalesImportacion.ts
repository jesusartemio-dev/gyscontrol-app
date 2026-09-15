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

export function totalGrupoEquipos(grupo: ExcelEquipoGrupo): number {
  return grupo.items.reduce((s, i) => s + i.precioCliente * i.cantidad, 0)
}

export function totalGrupoGastos(grupo: ExcelGastoGrupo): number {
  return grupo.items.reduce((s, i) => s + i.costoCliente, 0)
}

/**
 * Solo cuenta lo que el endpoint va a crear: los grupos sin EDT mapeado y los
 * recursos sin mapear se descartan en silencio al importar.
 */
export function totalGrupoServicios(
  grupo: ExcelServicioGrupo,
  recursoMappings: Record<string, string>,
  edtMappings: Record<string, string>
): number {
  if (!edtMappings[grupo.edtSugerido || grupo.grupo]) return 0

  return grupo.actividades.reduce(
    (s, act) =>
      s +
      act.recursos.reduce(
        (sr, rec) =>
          recursoMappings[rec.recursoNombre]
            ? sr + rec.horas * rec.costoHora * (grupo.factorSeguridad || 1)
            : sr,
        0
      ),
    0
  )
}

export function calcularTotalesImportacion(
  excel: ExcelExtraido,
  recursoMappings: Record<string, string>,
  edtMappings: Record<string, string>,
  gruposExcluidos: Record<string, boolean> = {}
): TotalesImportacion {
  const equipos = excel.equipos.reduce(
    (s, g, i) => (gruposExcluidos[`equipos-${i}`] ? s : s + totalGrupoEquipos(g)),
    0
  )
  const servicios = excel.servicios.reduce(
    (s, g, i) =>
      gruposExcluidos[`servicios-${i}`]
        ? s
        : s + totalGrupoServicios(g, recursoMappings, edtMappings),
    0
  )
  const gastos = excel.gastos.reduce(
    (s, g, i) => (gruposExcluidos[`gastos-${i}`] ? s : s + totalGrupoGastos(g)),
    0
  )

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
