import { prisma } from '@/lib/prisma'

interface GrupoSubtotales {
  subtotalInterno: number
  subtotalCliente: number
  subtotalReal: number
}

interface TotalesComputados {
  totalEquiposInterno: number
  totalServiciosInterno: number
  totalGastosInterno: number
  totalInterno: number
  totalEquiposCliente: number
  totalServiciosCliente: number
  totalGastosCliente: number
  totalCliente: number
  grandTotal: number
  totalRealEquipos: number
  totalRealServicios: number
  totalRealGastos: number
  totalReal: number
  descuento: number
  moneda: string | null
}

type ProyectoConGrupos = {
  descuento: number
  moneda: string | null
  proyectoEquipoCotizado: { id: string; proyectoEquipoCotizadoItem: { costoInterno: number; costoCliente: number; costoReal: number }[] }[]
  proyectoServicioCotizado: { id: string; proyectoServicioCotizadoItem: { costoInterno: number; costoCliente: number; costoReal: number }[] }[]
  proyectoGastoCotizado: { id: string; proyectoGastoCotizadoItem: { costoInterno: number; costoCliente: number; costoReal: number }[] }[]
}

function sumarGrupo(items: { costoInterno: number; costoCliente: number; costoReal: number }[]): GrupoSubtotales {
  return {
    subtotalInterno: items.reduce((sum, i) => sum + i.costoInterno, 0),
    subtotalCliente: items.reduce((sum, i) => sum + i.costoCliente, 0),
    subtotalReal: items.reduce((sum, i) => sum + i.costoReal, 0),
  }
}

/**
 * Suma items → grupos → totales generales del proyecto, en memoria, sin persistir.
 * Usar en vistas de solo lectura (nunca debe mutar datos al abrir una pantalla).
 */
function computarTotales(proyecto: ProyectoConGrupos): {
  equipos: GrupoSubtotales[]
  servicios: GrupoSubtotales[]
  gastos: GrupoSubtotales[]
  totales: TotalesComputados
} {
  const equipos = proyecto.proyectoEquipoCotizado.map(g => sumarGrupo(g.proyectoEquipoCotizadoItem))
  const servicios = proyecto.proyectoServicioCotizado.map(g => sumarGrupo(g.proyectoServicioCotizadoItem))
  const gastos = proyecto.proyectoGastoCotizado.map(g => sumarGrupo(g.proyectoGastoCotizadoItem))

  const totalEquiposInterno = equipos.reduce((acc, e) => acc + e.subtotalInterno, 0)
  const totalServiciosInterno = servicios.reduce((acc, s) => acc + s.subtotalInterno, 0)
  const totalGastosInterno = gastos.reduce((acc, g) => acc + g.subtotalInterno, 0)
  const totalInterno = totalEquiposInterno + totalServiciosInterno + totalGastosInterno

  const totalEquiposCliente = equipos.reduce((acc, e) => acc + e.subtotalCliente, 0)
  const totalServiciosCliente = servicios.reduce((acc, s) => acc + s.subtotalCliente, 0)
  const totalGastosCliente = gastos.reduce((acc, g) => acc + g.subtotalCliente, 0)
  const totalCliente = totalEquiposCliente + totalServiciosCliente + totalGastosCliente

  const totalRealEquipos = equipos.reduce((acc, e) => acc + e.subtotalReal, 0)
  const totalRealServicios = servicios.reduce((acc, s) => acc + s.subtotalReal, 0)
  const totalRealGastos = gastos.reduce((acc, g) => acc + g.subtotalReal, 0)
  const totalReal = totalRealEquipos + totalRealServicios + totalRealGastos

  const grandTotal = totalCliente - proyecto.descuento

  return {
    equipos,
    servicios,
    gastos,
    totales: {
      totalEquiposInterno,
      totalServiciosInterno,
      totalGastosInterno,
      totalInterno,
      totalEquiposCliente,
      totalServiciosCliente,
      totalGastosCliente,
      totalCliente,
      grandTotal,
      totalRealEquipos,
      totalRealServicios,
      totalRealGastos,
      totalReal,
      descuento: proyecto.descuento,
      moneda: proyecto.moneda,
    },
  }
}

const INCLUDE_GRUPOS = {
  proyectoEquipoCotizado: { include: { proyectoEquipoCotizadoItem: true } },
  proyectoServicioCotizado: { include: { proyectoServicioCotizadoItem: true } },
  proyectoGastoCotizado: { include: { proyectoGastoCotizadoItem: true } },
} as const

/**
 * Suma en vivo los totales del proyecto (por categoría, cliente/interno/real) directamente
 * desde los items, SIN persistir. Para usar en pantallas de solo lectura (ej. verificación
 * de cotización) donde los subtotales de grupo guardados en BD pueden estar desactualizados.
 */
export async function obtenerTotalesRealtimeProyecto(proyectoId: string): Promise<TotalesComputados> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: INCLUDE_GRUPOS,
  })
  if (!proyecto) throw new Error('Proyecto no encontrado')

  return computarTotales(proyecto).totales
}

/**
 * Recalcula subtotales de grupos y totales generales de un proyecto.
 * Suma costoInterno/costoCliente/costoReal de items para actualizar grupos,
 * luego suma subtotales de grupos para actualizar el proyecto.
 */
export async function recalcularTotalesProyecto(proyectoId: string): Promise<TotalesComputados> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: INCLUDE_GRUPOS,
  })

  if (!proyecto) throw new Error('Proyecto no encontrado')

  const { equipos, servicios, gastos, totales } = computarTotales(proyecto)

  await Promise.all([
    ...proyecto.proyectoEquipoCotizado.map((grupo, i) =>
      prisma.proyectoEquipoCotizado.update({
        where: { id: grupo.id },
        data: { ...equipos[i], updatedAt: new Date() },
      })
    ),
    ...proyecto.proyectoServicioCotizado.map((grupo, i) =>
      prisma.proyectoServicioCotizado.update({
        where: { id: grupo.id },
        data: { ...servicios[i], updatedAt: new Date() },
      })
    ),
    ...proyecto.proyectoGastoCotizado.map((grupo, i) =>
      prisma.proyectoGastoCotizado.update({
        where: { id: grupo.id },
        data: { ...gastos[i], updatedAt: new Date() },
      })
    ),
  ])

  await prisma.proyecto.update({
    where: { id: proyectoId },
    data: {
      totalEquiposInterno: totales.totalEquiposInterno,
      totalServiciosInterno: totales.totalServiciosInterno,
      totalGastosInterno: totales.totalGastosInterno,
      totalInterno: totales.totalInterno,
      totalCliente: totales.totalCliente,
      grandTotal: totales.grandTotal,
      totalRealEquipos: totales.totalRealEquipos,
      totalRealServicios: totales.totalRealServicios,
      totalRealGastos: totales.totalRealGastos,
      totalReal: totales.totalReal,
      updatedAt: new Date(),
    },
  })

  return totales
}
