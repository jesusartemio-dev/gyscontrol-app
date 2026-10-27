/**
 * CJM50-LST-002 Cable de Control: lo aprobado para compra es ÖLFLEX FD 855 3G2,5 mm², 50 m
 * (no el 2×1,5 cotizado). Reemplazo como "Reemplazar" de la app: sin cotizaciones →
 * se elimina el ítem original y se crea el nuevo (origen "reemplazo"); el cotizado queda
 * "reemplazado" con el motivo. Código y precio por definir (la cotización de Diprosol
 * 00008531 es del 2×1 mm², código LAPP 0027649).
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/reemplazo-olflex-cjm50.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

async function main() {
  const lista = await prisma.listaEquipo.findUniqueOrThrow({ where: { codigo: 'CJM50-LST-002' }, select: { id: true, nombre: true, responsableId: true } })
  const original = await prisma.listaEquipoItem.findFirstOrThrow({
    where: { listaId: lista.id, codigo: { startsWith: 'ÖLFLEX' } },
    include: { _count: { select: { cotizacionProveedorItems: true, pedidoEquipoItem: true, ordenCompraItems: true } } },
  })
  if (original._count.cotizacionProveedorItems || original._count.pedidoEquipoItem || original._count.ordenCompraItems) {
    throw new Error('El ítem ya tiene cotizaciones/pedidos/OC: reemplazarlo desde la app')
  }
  console.log(`CJM50-LST-002 ${lista.nombre}`)
  console.log(`  − ${original.codigo} · ${original.cantidad} ${original.unidad} · ${original.descripcion.slice(0, 60)}`)
  console.log('  + POR DEFINIR · 50 m · CABLE ÖLFLEX® FD 855 3G2,5 MM² · LAPP  (origen: reemplazo)')
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-olflex-CJM50-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(original, null, 2))
  const motivo = 'Aprobado para compra: ÖLFLEX FD 855 de 3G2,5 mm², 50 m (en lugar del 2×1,5 cotizado).'
  await prisma.$transaction(async tx => {
    await tx.listaEquipoItem.delete({ where: { id: original.id } })
    const nuevo = await tx.listaEquipoItem.create({ data: {
      id: `lista-item-${randomUUID()}`, listaId: lista.id, proyectoEquipoId: original.proyectoEquipoId,
      proyectoEquipoItemId: original.proyectoEquipoItemId, reemplazaProyectoEquipoCotizadoItemId: original.proyectoEquipoItemId,
      codigo: 'POR DEFINIR', descripcion: 'CABLE ÖLFLEX® FD 855 3G2,5 MM² LIBRE DE HALÓGENO', marca: 'LAPP', categoria: 'CABLE CONTROL',
      unidad: 'm', cantidad: 50, presupuesto: 0, orden: 0, estado: 'borrador', origen: 'reemplazo', tipoItem: 'equipo',
      comentarioRevision: `${motivo} Falta el código LAPP y el precio: la cotización Diprosol 00008531 es del 2×1 mm² (código 0027649). Confirmar si es la versión CP (apantallada).`,
      responsableId: lista.responsableId, createdAt: ahora, updatedAt: ahora,
    } })
    if (original.proyectoEquipoItemId) {
      await tx.proyectoEquipoCotizadoItem.update({ where: { id: original.proyectoEquipoItemId }, data: {
        estado: 'reemplazado', listaEquipoSeleccionadoId: nuevo.id, motivoCambio: motivo, updatedAt: ahora,
      } })
    }
  })
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
