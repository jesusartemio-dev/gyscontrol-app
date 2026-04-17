/**
 * Script: rename-codigos-pedidos-internos.ts
 * Propósito: Renombrar los códigos de pedidos internos de INT-GYS.*-XXX a GYS-PED-XXX
 *            También actualiza el campo metadata.pedidoCodigo en EventoTrazabilidad.
 *
 * Uso:          npx tsx scripts/rename-codigos-pedidos-internos.ts
 * Uso (dry-run): npx tsx scripts/rename-codigos-pedidos-internos.ts --dry-run
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const isDryRun = process.argv.includes('--dry-run')

// Mapa: código actual → código nuevo
const RENOMBRES: Record<string, string> = {
  'INT-GYS.-001': 'GYS-PED-001',
  'INT-GYS.-002': 'GYS-PED-002',
}

async function main() {
  console.log(isDryRun ? '🔍 DRY-RUN — no se realizarán cambios\n' : '🚀 Ejecutando renombrado...\n')

  // 1. Buscar los pedidos por su código actual
  const pedidos = await prisma.pedidoEquipo.findMany({
    where: { codigo: { in: Object.keys(RENOMBRES) } },
    select: { id: true, codigo: true, nombre: true },
  })

  if (pedidos.length === 0) {
    console.log('⚠️  No se encontraron pedidos con los códigos indicados.')
    console.log('   Códigos buscados:', Object.keys(RENOMBRES).join(', '))
    console.log('   Verifica los códigos exactos en la BD.')
    return
  }

  console.log(`📦 Pedidos encontrados: ${pedidos.length}`)
  for (const p of pedidos) {
    console.log(`   ${p.codigo} → ${RENOMBRES[p.codigo]}  (id: ${p.id}${p.nombre ? ` | ${p.nombre}` : ''})`)
  }

  // 2. Buscar EventoTrazabilidad con pedidoCodigo en metadata que coincidan
  const eventos = await prisma.eventoTrazabilidad.findMany({
    where: {
      metadata: {
        path: ['pedidoCodigo'],
        string_starts_with: 'INT-GYS',
      },
    },
    select: { id: true, metadata: true },
  })

  console.log(`\n📋 EventoTrazabilidad con pedidoCodigo a actualizar: ${eventos.length}`)
  if (eventos.length > 0) {
    for (const ev of eventos) {
      const meta = ev.metadata as Record<string, unknown>
      const codigoActual = meta?.pedidoCodigo as string
      const codigoNuevo = RENOMBRES[codigoActual]
      if (codigoNuevo) {
        console.log(`   evento ${ev.id}: ${codigoActual} → ${codigoNuevo}`)
      }
    }
  }

  if (isDryRun) {
    console.log('\n🔍 DRY-RUN completo. Ningún dato fue modificado.')
    return
  }

  // 3. Ejecutar en transacción
  await prisma.$transaction(async (tx) => {
    // Actualizar PedidoEquipo.codigo
    for (const pedido of pedidos) {
      const codigoNuevo = RENOMBRES[pedido.codigo]
      await tx.pedidoEquipo.update({
        where: { id: pedido.id },
        data: { codigo: codigoNuevo },
      })
      console.log(`\n✅ PedidoEquipo: ${pedido.codigo} → ${codigoNuevo}`)
    }

    // Actualizar metadata.pedidoCodigo en EventoTrazabilidad
    let eventosActualizados = 0
    for (const ev of eventos) {
      const meta = ev.metadata as Record<string, unknown>
      const codigoActual = meta?.pedidoCodigo as string
      const codigoNuevo = RENOMBRES[codigoActual]
      if (codigoNuevo) {
        await tx.eventoTrazabilidad.update({
          where: { id: ev.id },
          data: { metadata: { ...meta, pedidoCodigo: codigoNuevo } },
        })
        eventosActualizados++
      }
    }
    if (eventosActualizados > 0) {
      console.log(`✅ EventoTrazabilidad actualizados: ${eventosActualizados}`)
    }
  })

  console.log('\n✅ Renombrado completado.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
