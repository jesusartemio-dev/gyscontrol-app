// ===================================================
// 📁 Archivo: recalcular-cotizaciones.js
// 📌 Descripción: Script para recalcular totales de todas las cotizaciones
// 📌 Características: Sincroniza totalCliente y totalInterno con items reales
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-09-19
// ===================================================

const { PrismaClient } = require('@prisma/client')
const { recalcularTotalesCotizacion } = require('../src/lib/utils/recalculoCotizacion')

const prisma = new PrismaClient()

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
        console.error(`   ❌ Error procesando cotización ${cotizacion.id}:`, error.message)
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