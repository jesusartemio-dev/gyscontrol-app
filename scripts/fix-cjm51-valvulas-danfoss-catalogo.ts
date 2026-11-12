/**
 * CJM51-LST-009 "Instrumentos – Válvulas Automáticas": los 3 equipos Danfoss
 * (032U8504 válvula EV220B, 018F7360 bobina BB110CS, G1NU2000 caja de terminales)
 * estaban como equipo libre (sin ficha en el catálogo).
 *
 * - Corrige "VÁVULA" → "VÁLVULA" en la descripción.
 * - Crea la ficha en el catálogo general (categoría VÁLVULAS, und) con el precio
 *   cotizado (precio interno y factor de venta 1.25 → mismo precio cliente) y
 *   estado "pendiente" para que logística lo confirme.
 * - Vincula el ítem de la lista y su equipo cotizado a la ficha (igual que
 *   "Vincular al catálogo" de la app: /api/lista-equipo-item/[id]/vincular-catalogo).
 *
 * Uso: npx tsx scripts/fix-cjm51-valvulas-danfoss-catalogo.ts [--apply]
 */
import { createId } from '@paralleldrive/cuid2'
import { prisma } from '../src/lib/prisma'

const APPLY = process.argv.includes('--apply')
const LISTA_ID = 'b3dc6b33-c22a-4d4a-b8ea-8ff26f844ba0'
const CODIGOS = ['032U8504', '018F7360', 'G1NU2000']

async function main() {
  const categoria = await prisma.categoriaEquipo.findFirstOrThrow({ where: { nombre: 'VÁLVULAS' }, select: { id: true } })
  const unidad = await prisma.unidad.findFirstOrThrow({ where: { nombre: 'und' }, select: { id: true } })

  const items = await prisma.listaEquipoItem.findMany({
    where: { listaId: LISTA_ID, codigo: { in: CODIGOS } },
    select: { id: true, codigo: true, descripcion: true, marca: true, catalogoEquipoId: true, proyectoEquipoItemId: true },
  })
  if (items.length !== CODIGOS.length) throw new Error(`Se esperaban ${CODIGOS.length} ítems y hay ${items.length}`)

  for (const it of items) {
    const descripcion = it.descripcion.replace(/V[ÁA]VULA/g, m => (m.includes('Á') ? 'VÁLVULA' : 'VALVULA'))
    const cot = it.proyectoEquipoItemId
      ? await prisma.proyectoEquipoCotizadoItem.findUnique({ where: { id: it.proyectoEquipoItemId }, select: { precioInterno: true, precioCliente: true } })
      : null
    const precioLista = Number(cot?.precioInterno ?? 0)
    const factorVenta = precioLista > 0 && cot?.precioCliente ? Math.round((Number(cot.precioCliente) / precioLista) * 10000) / 10000 : 1.15
    const yaExiste = await prisma.catalogoEquipo.findFirst({ where: { codigo: { equals: it.codigo, mode: 'insensitive' } }, select: { id: true } })

    console.log(`${it.codigo}: ${it.catalogoEquipoId ? 'YA VINCULADO' : yaExiste ? 'existe en catálogo → vincular' : 'crear en catálogo'}` +
      ` · precio lista ${precioLista} · factor venta ${factorVenta} · venta ${Math.round(precioLista * factorVenta * 100) / 100}` +
      (descripcion !== it.descripcion ? ' · corrige VÁVULA → VÁLVULA' : ''))
    if (!APPLY || it.catalogoEquipoId) continue

    await prisma.$transaction(async tx => {
      const ficha = yaExiste ?? await tx.catalogoEquipo.create({
        data: {
          id: createId(),
          codigo: it.codigo,
          descripcion,
          marca: it.marca,
          precioLista,
          precioInterno: precioLista,
          factorCosto: 1,
          factorVenta,
          precioVenta: Math.round(precioLista * factorVenta * 100) / 100,
          categoriaId: categoria.id,
          unidadId: unidad.id,
          estado: 'pendiente',
        },
        select: { id: true },
      })
      await tx.listaEquipoItem.update({
        where: { id: it.id },
        data: { catalogoEquipoId: ficha.id, descripcion, unidad: 'und' },
      })
      if (it.proyectoEquipoItemId) {
        await tx.proyectoEquipoCotizadoItem.updateMany({
          where: { id: it.proyectoEquipoItemId, catalogoEquipoId: null },
          data: { catalogoEquipoId: ficha.id, updatedAt: new Date() },
        })
      }
    })
  }
  console.log(APPLY ? '\nAplicado.' : '\nDry-run: usar --apply')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
