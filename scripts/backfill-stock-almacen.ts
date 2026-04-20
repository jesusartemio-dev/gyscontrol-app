/**
 * Backfill: calcula el stock de materiales del almacén a partir del historial de
 * recepciones (en_almacen / entregado_proyecto) que aún no tienen MovimientoAlmacen.
 *
 * Uso: npx tsx scripts/backfill-stock-almacen.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const ALMACEN_ID = 'almacen-central'
  const SYSTEM_USER_ID_FALLBACK = 'user-admin-default'

  const almacen = await prisma.almacen.findUnique({ where: { id: ALMACEN_ID } })
  if (!almacen) throw new Error('Almacén Central no encontrado. Ejecuta seed-almacen.ts primero.')

  // Recepciones ya en almacén o entregadas que NO tienen movimiento asociado
  const recepciones = await prisma.recepcionPendiente.findMany({
    where: {
      estado: { in: ['en_almacen', 'entregado_proyecto'] },
      movimientosAlmacen: { none: {} },
    },
    include: {
      pedidoEquipoItem: { select: { catalogoEquipoId: true } },
      ordenCompraItem: { include: { pedidoEquipoItem: { select: { catalogoEquipoId: true } } } },
      confirmadoPor: { select: { id: true } },
      entregadoPor: { select: { id: true } },
    },
  })

  console.log(`📦 ${recepciones.length} recepciones sin movimiento de almacén`)

  let creadas = 0
  for (const rec of recepciones) {
    const catalogoEquipoId = rec.pedidoEquipoItem?.catalogoEquipoId
      || rec.ordenCompraItem?.pedidoEquipoItem?.catalogoEquipoId
      || null

    if (!catalogoEquipoId) continue // sin catálogo → no aplica stock

    const usuarioId = rec.confirmadoPor?.id || SYSTEM_USER_ID_FALLBACK

    await prisma.$transaction(async (tx) => {
      // Crear movimiento de entrada (siempre, porque llegó al almacén)
      await tx.movimientoAlmacen.create({
        data: {
          almacenId: ALMACEN_ID,
          tipo: 'entrada_recepcion',
          catalogoEquipoId,
          cantidad: rec.cantidadRecibida,
          usuarioId,
          recepcionPendienteId: rec.id,
          observaciones: '[backfill] Entrada histórica al almacén',
          fechaMovimiento: rec.fechaConfirmacion ?? rec.createdAt,
        },
      })

      const delta1 = rec.cantidadRecibida
      await tx.stockAlmacen.upsert({
        where: { almacenId_catalogoEquipoId: { almacenId: ALMACEN_ID, catalogoEquipoId } },
        create: { almacenId: ALMACEN_ID, catalogoEquipoId, cantidadDisponible: delta1 },
        update: { cantidadDisponible: { increment: delta1 } },
      })

      // Si ya fue entregado, también creamos el movimiento de salida
      if (rec.estado === 'entregado_proyecto') {
        const usuarioSalida = rec.entregadoPor?.id || usuarioId
        await tx.movimientoAlmacen.create({
          data: {
            almacenId: ALMACEN_ID,
            tipo: 'salida_proyecto',
            catalogoEquipoId,
            cantidad: rec.cantidadRecibida,
            usuarioId: usuarioSalida,
            recepcionPendienteId: rec.id,
            observaciones: '[backfill] Salida histórica a proyecto',
            fechaMovimiento: rec.fechaEntregaProyecto ?? rec.updatedAt,
          },
        })

        const delta2 = -rec.cantidadRecibida
        await tx.stockAlmacen.upsert({
          where: { almacenId_catalogoEquipoId: { almacenId: ALMACEN_ID, catalogoEquipoId } },
          create: { almacenId: ALMACEN_ID, catalogoEquipoId, cantidadDisponible: delta2 },
          update: { cantidadDisponible: { increment: delta2 } },
        })
      }
    })

    creadas++
    if (creadas % 50 === 0) console.log(`  ... ${creadas} procesadas`)
  }

  console.log(`✅ Backfill completado: ${creadas} recepciones procesadas`)

  // Resumen del stock resultante
  const stock = await prisma.stockAlmacen.findMany({
    where: { almacenId: ALMACEN_ID, cantidadDisponible: { gt: 0 } },
    include: { catalogoEquipo: { select: { codigo: true, descripcion: true } } },
    orderBy: { cantidadDisponible: 'desc' },
    take: 10,
  })

  console.log('\n📊 Top 10 items con stock:')
  for (const s of stock) {
    console.log(`  ${s.catalogoEquipo?.codigo} - ${s.catalogoEquipo?.descripcion}: ${s.cantidadDisponible}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
