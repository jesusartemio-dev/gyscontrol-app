// ===================================================
// 📁 Archivo: recalculoCotizacion.ts
// 🗄️ Ubicación: src/lib/utils/recalculoCotizacion.ts
// 🔧 Descripción: Recalcula subtotales y totales de una cotización
//
// 🧠 Uso: Solo backend. Se usa en rutas API o procesos server-side.
// ✍️ Autor: Jesús Artemio
// 🗕️ Última actualización: 2025-05-07
// ===================================================

import { prisma } from '@/lib/prisma'
import { calcularSubtotal, calcularTotal } from './costos'

export async function recalcularTotalesCotizacion(id: string) {
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      equipos: { include: { items: true } },
      servicios: { include: { items: true } },
      gastos: { include: { items: true } },
    },
  })

  if (!cotizacion) throw new Error('Cotización no encontrada')

  const equiposActualizados = await Promise.all(
    cotizacion.equipos.map(async (grupo) => {
      const subtotales = calcularSubtotal(grupo.items)
      await prisma.cotizacionEquipo.update({
        where: { id: grupo.id },
        data: subtotales,
      })
      return subtotales
    })
  )

  const serviciosActualizados = await Promise.all(
    cotizacion.servicios.map(async (grupo) => {
      const subtotales = calcularSubtotal(grupo.items)
      await prisma.cotizacionServicio.update({
        where: { id: grupo.id },
        data: subtotales,
      })
      return subtotales
    })
  )

  const gastosActualizados = await Promise.all(
    cotizacion.gastos.map(async (grupo) => {
      const subtotales = calcularSubtotal(grupo.items)
      await prisma.cotizacionGasto.update({
        where: { id: grupo.id },
        data: subtotales,
      })
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
  const grandTotal = totalCliente - cotizacion.descuento

  await prisma.cotizacion.update({
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
    },
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
