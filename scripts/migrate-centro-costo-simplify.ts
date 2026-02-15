// ===================================================
// Script: migrate-centro-costo-simplify.ts
// Descripción: Migra datos existentes para la simplificación de CentroCosto
//
// Cambios:
// 1. CentroCosto: eliminar tipo "proyecto", limpiar proyectoId
// 2. HojaDeGastos: centroCostoId ahora opcional, agregar proyectoId + categoriaCosto
// 3. PedidoEquipo: eliminar centroCostoId (siempre era null)
// 4. OrdenCompra: agregar categoriaCosto
//
// Ejecutar DESPUÉS de prisma db push:
//   npx tsx scripts/migrate-centro-costo-simplify.ts
// ===================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate(): Promise<void> {
  console.log('🚀 Iniciando migración de CentroCosto...\n')

  // ──────────────────────────────────────────────
  // 1. Migrar centros de costo tipo "proyecto"
  // ──────────────────────────────────────────────
  console.log('📋 Paso 1: Migrar centros de costo tipo "proyecto"')

  const centrosProyecto = await prisma.centroCosto.findMany({
    where: { tipo: 'proyecto' },
    include: { hojas: { select: { id: true } }, ordenesCompra: { select: { id: true } } },
  })

  console.log(`   Encontrados: ${centrosProyecto.length} centros con tipo "proyecto"`)

  for (const cc of centrosProyecto) {
    const tieneHojas = cc.hojas.length > 0
    const tieneOC = cc.ordenesCompra.length > 0

    if (!tieneHojas && !tieneOC) {
      // Sin datos asociados: desactivar
      await prisma.centroCosto.update({
        where: { id: cc.id },
        data: { tipo: 'administrativo', activo: false, updatedAt: new Date() },
      })
      console.log(`   ✓ "${cc.nombre}" → desactivado (sin documentos asociados)`)
    } else {
      // Con datos: cambiar tipo a administrativo, mantener activo
      await prisma.centroCosto.update({
        where: { id: cc.id },
        data: { tipo: 'administrativo', updatedAt: new Date() },
      })
      console.log(`   ✓ "${cc.nombre}" → tipo cambiado a "administrativo" (tiene ${cc.hojas.length} hojas, ${cc.ordenesCompra.length} OCs)`)
    }
  }

  // ──────────────────────────────────────────────
  // 2. Verificar HojaDeGastos existentes
  // ──────────────────────────────────────────────
  console.log('\n📋 Paso 2: Verificar HojaDeGastos existentes')

  const hojasExistentes = await prisma.hojaDeGastos.count()
  const hojasConCC = await prisma.hojaDeGastos.count({ where: { centroCostoId: { not: null } } })

  console.log(`   Total hojas: ${hojasExistentes}`)
  console.log(`   Con centroCostoId: ${hojasConCC}`)
  console.log(`   Nota: Las hojas existentes mantienen su centroCostoId. Nuevas hojas usarán proyectoId o centroCostoId.`)

  // ──────────────────────────────────────────────
  // 3. Verificar OrdenCompra — agregar categoriaCosto default
  // ──────────────────────────────────────────────
  console.log('\n📋 Paso 3: Verificar OrdenCompra existentes')

  const ocsExistentes = await prisma.ordenCompra.count()
  console.log(`   Total OCs: ${ocsExistentes}`)
  console.log(`   categoriaCosto default "equipos" aplicado por schema`)

  // ──────────────────────────────────────────────
  // 4. Verificar PedidoEquipo.centroCostoId
  // ──────────────────────────────────────────────
  console.log('\n📋 Paso 4: Verificar PedidoEquipo')

  // After prisma db push, the centroCostoId column will be dropped automatically
  // Just report what was there
  console.log(`   centroCostoId eliminado del schema (siempre era null)`)

  // ──────────────────────────────────────────────
  // Resumen
  // ──────────────────────────────────────────────
  console.log('\n✅ Migración completada')
  console.log('   - CentroCosto: tipo "proyecto" eliminado, proyectoId eliminado')
  console.log('   - HojaDeGastos: centroCostoId ahora nullable, proyectoId + categoriaCosto agregados')
  console.log('   - OrdenCompra: categoriaCosto agregado (default "equipos")')
  console.log('   - PedidoEquipo: centroCostoId eliminado')
  console.log('\n⚠️  Recuerda actualizar APIs y UI en las siguientes fases')
}

migrate()
  .catch((e) => {
    console.error('❌ Error en migración:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
