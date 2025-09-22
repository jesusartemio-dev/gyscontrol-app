// ===================================================
// 📁 Archivo: recalcular-cotizaciones.ts
// 📌 Descripción: Script para recalcular totales de todas las cotizaciones
// 📌 Características: Sincroniza totalCliente y totalInterno con items reales
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-09-19
// ===================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Calcula los subtotales interno y cliente de un arreglo de ítems.
 */
function calcularSubtotal(
  items: { costoInterno: number; costoCliente: number }[]
): { subtotalInterno: number; subtotalCliente: number } {
  return {
    subtotalInterno: items.reduce((sum, item) => sum + item.costoInterno, 0),
    subtotalCliente: items.reduce((sum, item) => sum + item.costoCliente, 0),
  }
}

/**
 * Calcula los totales generales de una cotización.
 */
function calcularTotal({
  equipos = [],
  servicios = [],
  gastos = [],
}: {
  equipos?: { subtotalCliente: number; subtotalInterno: number }[]
  servicios?: { subtotalCliente: number; subtotalInterno: number }[]
  gastos?: { subtotalCliente: number; subtotalInterno: number }[]
}): { totalInterno: number; totalCliente: number } {
  const totalInterno =
    equipos.reduce((acc, eq) => acc + eq.subtotalInterno, 0) +
    servicios.reduce((acc, sv) => acc + sv.subtotalInterno, 0) +
    gastos.reduce((acc, gs) => acc + gs.subtotalInterno, 0)

  const totalCliente =
    equipos.reduce((acc, eq) => acc + eq.subtotalCliente, 0) +
    servicios.reduce((acc, sv) => acc + sv.subtotalCliente, 0) +
    gastos.reduce((acc, gs) => acc + gs.subtotalCliente, 0)

  return { totalInterno, totalCliente }
}

/**
 * Recalcula totales de una cotización específica
 */
async function recalcularTotalesCotizacion(id: string) {
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

/**
 * ✅ Recalcula totales para todas las cotizaciones
 */
async function recalcularTodasLasCotizaciones() {
  try {
    console.log('🔄 Iniciando recálculo de totales de cotizaciones...')

    // 📡 Obtener todas las cotizaciones con información básica
    const cotizaciones = await prisma.cotizacion.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        totalInterno: true,
        totalCliente: true,
        _count: {
          select: {
            equipos: true,
            servicios: true,
            gastos: true
          }
        }
      }
    })

    console.log(`📊 Procesando ${cotizaciones.length} cotizaciones...`)

    let cotizacionesRecalculadas = 0
    let cambiosRealizados = []

    // 🔁 Procesar cada cotización
    for (const cotizacion of cotizaciones) {
      console.log(`\n🔄 Procesando cotización: ${cotizacion.codigo} - ${cotizacion.nombre}`)

      try {
        // ✅ Recalcular totales
        const totalesAnteriores = {
          totalInterno: cotizacion.totalInterno,
          totalCliente: cotizacion.totalCliente
        }

        const nuevosTotales = await recalcularTotalesCotizacion(cotizacion.id)

        // 🔍 Verificar si hubo cambios
        const cambioInterno = Math.abs(nuevosTotales.totalInterno - totalesAnteriores.totalInterno) > 0.01
        const cambioCliente = Math.abs(nuevosTotales.totalCliente - totalesAnteriores.totalCliente) > 0.01

        if (cambioInterno || cambioCliente) {
          cambiosRealizados.push({
            id: cotizacion.id,
            codigo: cotizacion.codigo,
            nombre: cotizacion.nombre,
            totalesAnteriores,
            nuevosTotales,
            items: cotizacion._count
          })

          console.log(`   ✅ Cambios detectados:`)
          console.log(`      Total Interno: ${totalesAnteriores.totalInterno} → ${nuevosTotales.totalInterno}`)
          console.log(`      Total Cliente: ${totalesAnteriores.totalCliente} → ${nuevosTotales.totalCliente}`)
        } else {
          console.log(`   ℹ️  Sin cambios necesarios`)
        }

        cotizacionesRecalculadas++

      } catch (error) {
        console.error(`   ❌ Error procesando cotización ${cotizacion.id}:`, error instanceof Error ? error.message : String(error))
      }
    }

    // 📋 Mostrar resultados
    console.log(`\n📊 Resumen del recálculo:`)
    console.log(`   • Cotizaciones procesadas: ${cotizaciones.length}`)
    console.log(`   • Cotizaciones recalculadas: ${cotizacionesRecalculadas}`)
    console.log(`   • Cambios realizados: ${cambiosRealizados.length}`)

    if (cambiosRealizados.length > 0) {
      console.log(`\n📋 Detalles de cambios realizados:`)
      cambiosRealizados.forEach((cambio, index) => {
        console.log(`${index + 1}. ${cambio.codigo} - ${cambio.nombre}`)
        console.log(`   Items: ${cambio.items.equipos} equipos, ${cambio.items.servicios} servicios, ${cambio.items.gastos} gastos`)
        console.log(`   Total Interno: ${cambio.totalesAnteriores.totalInterno} → ${cambio.nuevosTotales.totalInterno}`)
        console.log(`   Total Cliente: ${cambio.totalesAnteriores.totalCliente} → ${cambio.nuevosTotales.totalCliente}`)
        console.log('   ---')
      })
    }

    // ✅ Verificación final
    const cotizacionesConItems = await prisma.cotizacion.count({
      where: {
        OR: [
          { equipos: { some: {} } },
          { servicios: { some: {} } },
          { gastos: { some: {} } }
        ]
      }
    })

    const cotizacionesSinTotales = await prisma.cotizacion.count({
      where: {
        AND: [
          {
            OR: [
              { equipos: { some: {} } },
              { servicios: { some: {} } },
              { gastos: { some: {} } }
            ]
          },
          {
            OR: [
              { totalInterno: 0 },
              { totalCliente: 0 }
            ]
          }
        ]
      }
    })

    console.log(`\n🔍 Verificación final:`)
    console.log(`   • Cotizaciones con items: ${cotizacionesConItems}`)
    console.log(`   • Cotizaciones con items pero totales en cero: ${cotizacionesSinTotales}`)

    if (cotizacionesSinTotales === 0) {
      console.log('✅ ¡Todas las cotizaciones tienen totales correctos!')
    } else {
      console.log('⚠️  Aún hay cotizaciones que requieren atención')
    }

    console.log('🎉 Recálculo completado exitosamente')

  } catch (error) {
    console.error('❌ Error durante el recálculo:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 🔍 Función para auditar inconsistencias sin corregir
 */
async function auditarCotizaciones() {
  try {
    console.log('🔍 Auditando inconsistencias en totales de cotizaciones...')

    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        equipos: { include: { items: true } },
        servicios: { include: { items: true } },
        gastos: { include: { items: true } }
      }
    })

    const inconsistencias = []

    for (const cotizacion of cotizaciones) {
      // Calcular totales reales
      const totalInternoReal = [
        ...cotizacion.equipos,
        ...cotizacion.servicios,
        ...cotizacion.gastos
      ].reduce((total, grupo) => {
        return total + (grupo.subtotalInterno || 0)
      }, 0)

      const totalClienteReal = [
        ...cotizacion.equipos,
        ...cotizacion.servicios,
        ...cotizacion.gastos
      ].reduce((total, grupo) => {
        return total + (grupo.subtotalCliente || 0)
      }, 0)

      const diferenciaInterno = Math.abs(cotizacion.totalInterno - totalInternoReal)
      const diferenciaCliente = Math.abs(cotizacion.totalCliente - totalClienteReal)

      if (diferenciaInterno > 0.01 || diferenciaCliente > 0.01) {
        inconsistencias.push({
          id: cotizacion.id,
          codigo: cotizacion.codigo,
          nombre: cotizacion.nombre,
          totalInternoAlmacenado: cotizacion.totalInterno,
          totalInternoReal,
          totalClienteAlmacenado: cotizacion.totalCliente,
          totalClienteReal,
          diferenciaInterno,
          diferenciaCliente
        })
      }
    }

    console.log(`📊 Encontradas ${inconsistencias.length} inconsistencias de ${cotizaciones.length} cotizaciones`)

    if (inconsistencias.length > 0) {
      console.log('\n📋 Inconsistencias encontradas:')
      inconsistencias.forEach((item, index) => {
        console.log(`${index + 1}. ${item.codigo} - ${item.nombre}`)
        console.log(`   Total Interno: ${item.totalInternoAlmacenado} (almacenado) vs ${item.totalInternoReal} (real)`)
        console.log(`   Total Cliente: ${item.totalClienteAlmacenado} (almacenado) vs ${item.totalClienteReal} (real)`)
        console.log(`   Diferencias: Interno=${item.diferenciaInterno.toFixed(2)}, Cliente=${item.diferenciaCliente.toFixed(2)}`)
        console.log('   ---')
      })
    }

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 🚀 Ejecutar según argumentos de línea de comandos
const args = process.argv.slice(2)
const comando = args[0] || 'recalcular'

if (comando === 'auditar') {
  auditarCotizaciones()
    .catch((error) => {
      console.error('❌ Error fatal en auditoría:', error)
      process.exit(1)
    })
} else {
  recalcularTodasLasCotizaciones()
    .catch((error) => {
      console.error('❌ Error fatal en recálculo:', error)
      process.exit(1)
    })
}