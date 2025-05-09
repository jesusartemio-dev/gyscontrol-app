// ===================================================
// 📁 Archivo: recalculoPlantilla.ts
// 🗄️ Ubicación: src/lib/utils/recalculoPlantilla.ts
// 🔧 Descripción: Recalcula subtotales y totales de una plantilla
//
// 🧠 Uso: Solo backend. Se llama desde rutas API o procesos server-side
// ✍️ Autor: Jesús Artemio
// 🗕️ Última actualización: 2025-05-07
// ===================================================

import { prisma } from '@/lib/prisma'
import { calcularSubtotal, calcularTotal } from './costos'

/**
 * Recalcula todos los subtotales de equipos, servicios y gastos,
 * así como los totales generales de una plantilla.
 *
 * - Actualiza los campos `subtotalInterno`, `subtotalCliente`
 *   en cada grupo de equipo, servicio y gasto.
 * - Luego, actualiza todos los totales detallados en la plantilla.
 *
 * @param id ID de la plantilla
 * @returns Totales generales recalculados
 */
export async function recalcularTotalesPlantilla(id: string) {
  const plantilla = await prisma.plantilla.findUnique({
    where: { id },
    include: {
      equipos: { include: { items: true } },
      servicios: { include: { items: true } },
      gastos: { include: { items: true } }
    }
  })

  if (!plantilla) throw new Error('Plantilla no encontrada')

  const equiposActualizados = await Promise.all(
    plantilla.equipos.map(async (eq) => {
      const subtotales = calcularSubtotal(eq.items)
      await prisma.plantillaEquipo.update({ where: { id: eq.id }, data: subtotales })
      return subtotales
    })
  )

  const serviciosActualizados = await Promise.all(
    plantilla.servicios.map(async (sv) => {
      const subtotales = calcularSubtotal(sv.items)
      await prisma.plantillaServicio.update({ where: { id: sv.id }, data: subtotales })
      return subtotales
    })
  )

  const gastosActualizados = await Promise.all(
    plantilla.gastos.map(async (gt) => {
      const subtotales = calcularSubtotal(gt.items)
      await prisma.plantillaGasto.update({ where: { id: gt.id }, data: subtotales })
      return subtotales
    })
  )

  const totalEquiposInterno = equiposActualizados.reduce((acc, e) => acc + e.subtotalInterno, 0)
  const totalEquiposCliente = equiposActualizados.reduce((acc, e) => acc + e.subtotalCliente, 0)
  const totalServiciosInterno = serviciosActualizados.reduce((acc, s) => acc + s.subtotalInterno, 0)
  const totalServiciosCliente = serviciosActualizados.reduce((acc, s) => acc + s.subtotalCliente, 0)
  const totalGastosInterno = gastosActualizados.reduce((acc, g) => acc + g.subtotalInterno, 0)
  const totalGastosCliente = gastosActualizados.reduce((acc, g) => acc + g.subtotalCliente, 0)

  const totalInterno = totalEquiposInterno + totalServiciosInterno + totalGastosInterno
  const totalCliente = totalEquiposCliente + totalServiciosCliente + totalGastosCliente
  const grandTotal = totalCliente - plantilla.descuento

  await prisma.plantilla.update({
    where: { id },
    data: {
      totalEquiposInterno,
      totalEquiposCliente,
      totalServiciosInterno,
      totalServiciosCliente,
      totalGastosInterno,
      totalGastosCliente,
      totalInterno,
      totalCliente,
      grandTotal
    }
  })

  return {
    totalEquiposInterno,
    totalEquiposCliente,
    totalServiciosInterno,
    totalServiciosCliente,
    totalGastosInterno,
    totalGastosCliente,
    totalInterno,
    totalCliente,
    grandTotal
  }
}
