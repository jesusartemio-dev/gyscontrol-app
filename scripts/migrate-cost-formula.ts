/**
 * Script de migración para actualizar la fórmula de costos
 *
 * CAMBIO:
 * ANTES: costoInterno = horas × costoHora × factorSeguridad
 *        costoCliente = costoInterno × margen
 *
 * DESPUÉS: costoCliente = horas × costoHora × factorSeguridad (cálculo directo)
 *          costoInterno = costoCliente / margen (derivado)
 *
 * Este script recalcula costoInterno para todos los registros existentes
 * basándose en: costoInterno = costoCliente / margen
 *
 * Ejecutar con: npx ts-node scripts/migrate-cost-formula.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateCotizacionServicioItems() {
  console.log('📦 Migrando CotizacionServicioItem...')

  const items = await prisma.cotizacionServicioItem.findMany({
    select: {
      id: true,
      costoCliente: true,
      margen: true,
      costoInterno: true
    }
  })

  let updated = 0
  for (const item of items) {
    const margen = item.margen || 1.35
    const nuevoCostoInterno = +(item.costoCliente / margen).toFixed(2)

    // Solo actualizar si hay diferencia significativa
    if (Math.abs(nuevoCostoInterno - item.costoInterno) > 0.01) {
      await prisma.cotizacionServicioItem.update({
        where: { id: item.id },
        data: { costoInterno: nuevoCostoInterno }
      })
      updated++
    }
  }

  console.log(`   ✅ ${updated}/${items.length} registros actualizados`)
  return updated
}

async function migrateCotizacionGastoItems() {
  console.log('💰 Migrando CotizacionGastoItem...')

  const items = await prisma.cotizacionGastoItem.findMany({
    select: {
      id: true,
      costoCliente: true,
      margen: true,
      costoInterno: true
    }
  })

  let updated = 0
  for (const item of items) {
    const margen = item.margen || 1.25
    const nuevoCostoInterno = +(item.costoCliente / margen).toFixed(2)

    if (Math.abs(nuevoCostoInterno - item.costoInterno) > 0.01) {
      await prisma.cotizacionGastoItem.update({
        where: { id: item.id },
        data: { costoInterno: nuevoCostoInterno }
      })
      updated++
    }
  }

  console.log(`   ✅ ${updated}/${items.length} registros actualizados`)
  return updated
}

async function migratePlantillaServicioItems() {
  console.log('📋 Migrando PlantillaServicioItemIndependiente...')

  const items = await prisma.plantillaServicioItemIndependiente.findMany({
    select: {
      id: true,
      costoCliente: true,
      margen: true,
      costoInterno: true
    }
  })

  let updated = 0
  for (const item of items) {
    // Handle both margen formats (0.35 or 1.35)
    const margen = item.margen > 2 ? item.margen : (1 + item.margen)
    const nuevoCostoInterno = +(item.costoCliente / margen).toFixed(2)

    if (Math.abs(nuevoCostoInterno - item.costoInterno) > 0.01) {
      await prisma.plantillaServicioItemIndependiente.update({
        where: { id: item.id },
        data: { costoInterno: nuevoCostoInterno }
      })
      updated++
    }
  }

  console.log(`   ✅ ${updated}/${items.length} registros actualizados`)
  return updated
}

async function migratePlantillaGastoItems() {
  console.log('📋 Migrando PlantillaGastoItemIndependiente...')

  const items = await prisma.plantillaGastoItemIndependiente.findMany({
    select: {
      id: true,
      costoCliente: true,
      margen: true,
      costoInterno: true
    }
  })

  let updated = 0
  for (const item of items) {
    const margen = item.margen || 1.25
    const nuevoCostoInterno = +(item.costoCliente / margen).toFixed(2)

    if (Math.abs(nuevoCostoInterno - item.costoInterno) > 0.01) {
      await prisma.plantillaGastoItemIndependiente.update({
        where: { id: item.id },
        data: { costoInterno: nuevoCostoInterno }
      })
      updated++
    }
  }

  console.log(`   ✅ ${updated}/${items.length} registros actualizados`)
  return updated
}

async function main() {
  console.log('🚀 Iniciando migración de fórmula de costos...')
  console.log('=' .repeat(50))
  console.log('')
  console.log('Nueva fórmula:')
  console.log('  costoCliente = horas × costoHora × factorSeguridad')
  console.log('  costoInterno = costoCliente / margen')
  console.log('')
  console.log('=' .repeat(50))
  console.log('')

  try {
    const servicios = await migrateCotizacionServicioItems()
    const gastos = await migrateCotizacionGastoItems()
    const plantillaServicios = await migratePlantillaServicioItems()
    const plantillaGastos = await migratePlantillaGastoItems()

    console.log('')
    console.log('=' .repeat(50))
    console.log('📊 Resumen de migración:')
    console.log(`   - CotizacionServicioItem: ${servicios} actualizados`)
    console.log(`   - CotizacionGastoItem: ${gastos} actualizados`)
    console.log(`   - PlantillaServicioItem: ${plantillaServicios} actualizados`)
    console.log(`   - PlantillaGastoItem: ${plantillaGastos} actualizados`)
    console.log('')
    console.log('✅ Migración completada exitosamente!')
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
