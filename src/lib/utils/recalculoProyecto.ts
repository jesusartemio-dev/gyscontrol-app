import { prisma } from '@/lib/prisma'

/**
 * Recalcula subtotales de grupos y totales generales de un proyecto.
 * Suma costoInterno/costoCliente/costoReal de items para actualizar grupos,
 * luego suma subtotales de grupos para actualizar el proyecto.
 */
export async function recalcularTotalesProyecto(proyectoId: string) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      proyectoEquipoCotizado: { include: { proyectoEquipoCotizadoItem: true } },
      proyectoServicioCotizado: { include: { proyectoServicioCotizadoItem: true } },
      proyectoGastoCotizado: { include: { proyectoGastoCotizadoItem: true } },
    },
  })

  if (!proyecto) throw new Error('Proyecto no encontrado')

  // Recalcular subtotales de equipos
  const equiposActualizados = await Promise.all(
    proyecto.proyectoEquipoCotizado.map(async (grupo) => {
      const items = grupo.proyectoEquipoCotizadoItem
      const subtotalInterno = items.reduce((sum, i) => sum + i.costoInterno, 0)
      const subtotalCliente = items.reduce((sum, i) => sum + i.costoCliente, 0)
      const subtotalReal = items.reduce((sum, i) => sum + i.costoReal, 0)

      await prisma.proyectoEquipoCotizado.update({
        where: { id: grupo.id },
        data: { subtotalInterno, subtotalCliente, subtotalReal, updatedAt: new Date() },
      })
      return { subtotalInterno, subtotalCliente, subtotalReal }
    })
  )

  // Recalcular subtotales de servicios
  const serviciosActualizados = await Promise.all(
    proyecto.proyectoServicioCotizado.map(async (grupo) => {
      const items = grupo.proyectoServicioCotizadoItem
      const subtotalInterno = items.reduce((sum, i) => sum + i.costoInterno, 0)
      const subtotalCliente = items.reduce((sum, i) => sum + i.costoCliente, 0)
      const subtotalReal = items.reduce((sum, i) => sum + i.costoReal, 0)

      await prisma.proyectoServicioCotizado.update({
        where: { id: grupo.id },
        data: { subtotalInterno, subtotalCliente, subtotalReal, updatedAt: new Date() },
      })
      return { subtotalInterno, subtotalCliente, subtotalReal }
    })
  )

  // Recalcular subtotales de gastos
  const gastosActualizados = await Promise.all(
    proyecto.proyectoGastoCotizado.map(async (grupo) => {
      const items = grupo.proyectoGastoCotizadoItem
      const subtotalInterno = items.reduce((sum, i) => sum + i.costoInterno, 0)
      const subtotalCliente = items.reduce((sum, i) => sum + i.costoCliente, 0)
      const subtotalReal = items.reduce((sum, i) => sum + i.costoReal, 0)

      await prisma.proyectoGastoCotizado.update({
        where: { id: grupo.id },
        data: { subtotalInterno, subtotalCliente, subtotalReal, updatedAt: new Date() },
      })
      return { subtotalInterno, subtotalCliente, subtotalReal }
    })
  )

  // Totales internos
  const totalEquiposInterno = equiposActualizados.reduce((acc, e) => acc + e.subtotalInterno, 0)
  const totalServiciosInterno = serviciosActualizados.reduce((acc, s) => acc + s.subtotalInterno, 0)
  const totalGastosInterno = gastosActualizados.reduce((acc, g) => acc + g.subtotalInterno, 0)
  const totalInterno = totalEquiposInterno + totalServiciosInterno + totalGastosInterno

  // Totales cliente
  const totalCliente =
    equiposActualizados.reduce((acc, e) => acc + e.subtotalCliente, 0) +
    serviciosActualizados.reduce((acc, s) => acc + s.subtotalCliente, 0) +
    gastosActualizados.reduce((acc, g) => acc + g.subtotalCliente, 0)

  // Totales reales
  const totalRealEquipos = equiposActualizados.reduce((acc, e) => acc + e.subtotalReal, 0)
  const totalRealServicios = serviciosActualizados.reduce((acc, s) => acc + s.subtotalReal, 0)
  const totalRealGastos = gastosActualizados.reduce((acc, g) => acc + g.subtotalReal, 0)
  const totalReal = totalRealEquipos + totalRealServicios + totalRealGastos

  const grandTotal = totalCliente - proyecto.descuento

  await prisma.proyecto.update({
    where: { id: proyectoId },
    data: {
      totalEquiposInterno,
      totalServiciosInterno,
      totalGastosInterno,
      totalInterno,
      totalCliente,
      grandTotal,
      totalRealEquipos,
      totalRealServicios,
      totalRealGastos,
      totalReal,
      updatedAt: new Date(),
    },
  })

  return {
    totalEquiposInterno,
    totalServiciosInterno,
    totalGastosInterno,
    totalInterno,
    totalCliente,
    grandTotal,
    totalRealEquipos,
    totalRealServicios,
    totalRealGastos,
    totalReal,
  }
}
