/**
 * CJM51 — cambios de cables tras los cálculos (bomba de 15 HP; válvulas sin
 * confirmación de apertura/cierre). Mismo criterio que "Reemplazar" de la app.
 *  LST-001 Cables de Fuerza y Control:
 *    4G10 300 → 210 m · 7G2,5 900 → 200 m · + 3G2,5 400 m (nuevo, código por confirmar)
 *  LST-002 Cable de Instrumentación:
 *    Belden 1492A 600 m → reemplazado por Dixon 8030 LSZH 610 m (cotizado queda "reemplazado")
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/cambios-cables-cjm51.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

async function main() {
  const lista = (codigo: string) => prisma.listaEquipo.findUniqueOrThrow({
    where: { codigo },
    include: { listaEquipoItem: { include: { _count: { select: { cotizacionProveedorItems: true, pedidoEquipoItem: true, ordenCompraItems: true } } } } },
  })
  const l1 = await lista('CJM51-LST-001')
  const l2 = await lista('CJM51-LST-002')
  const item = (l: typeof l1, codigo: string) => {
    const x = l.listaEquipoItem.find(i => i.codigo === codigo)
    if (!x) throw new Error(`${l.codigo} no tiene ${codigo}`)
    if (x._count.cotizacionProveedorItems || x._count.pedidoEquipoItem || x._count.ordenCompraItems) throw new Error(`${codigo} ya tiene cotizaciones/pedidos/OC: hacerlo desde la app`)
    return x
  }
  const fuerza = item(l1, '820704101009203')
  const control = item(l1, '82140712-509203')
  const belden = item(l2, '1492A')

  console.log(`${l1.codigo} ${l1.nombre}`)
  console.log(`  ~ 4G10mm²  ${fuerza.cantidad} → 210 m   (Fuerza CCM 320K - Bomba 15 HP)`)
  console.log(`  ~ 7G2,5mm² ${control.cantidad} → 200 m   (Control botonera en campo)`)
  console.log('  + 3G2,5mm² 400 m · MIGUELEZ · código POR DEFINIR (Control válvulas D019 y D024, 2 x 200 m)')
  console.log(`${l2.codigo} ${l2.nombre}`)
  console.log(`  ⇄ Belden 1492A ${belden.cantidad} m → Dixon 8030 LSZH 610 m (Lazos 4-20 mA, 2 carretes x 305 m)`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-cables-CJM51-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ fuerza, control, belden }, null, 2))
  await prisma.$transaction(async tx => {
    await tx.listaEquipoItem.update({ where: { id: fuerza.id }, data: {
      cantidad: 210, comentarioRevision: 'Fuerza CCM 320K - Bomba 15 HP. Cotizado: 300 m; ajustado por cálculo (cambio de potencia).',
    } })
    await tx.listaEquipoItem.update({ where: { id: control.id }, data: {
      cantidad: 200, comentarioRevision: 'Control botonera en campo. Cotizado: 900 m de 7G2,5 → 200 m de 7G2,5 + 400 m de 3G2,5 (válvulas sin confirmación de apertura/cierre).',
    } })
    await tx.listaEquipoItem.create({ data: {
      id: `lista-item-${randomUUID()}`, listaId: l1.id, proyectoEquipoId: control.proyectoEquipoId,
      codigo: 'POR DEFINIR', descripcion: 'CABLE CONTROL 0,6/1KV LIBRE HALOGENO 3G2,5MM2 NEGRO', marca: 'MIGUELEZ', categoria: 'CABLE CONTROL',
      unidad: 'm', cantidad: 400, presupuesto: 0, orden: 2, estado: 'borrador', origen: 'nuevo', tipoItem: 'equipo',
      comentarioRevision: 'Control válvulas solenoides D019 y D024 (2 x 200 m). Sale de los 900 m de 7G2,5 cotizados (válvulas sin confirmación de apertura/cierre). Confirmar código con el proveedor.',
      responsableId: l1.responsableId, createdAt: ahora, updatedAt: ahora,
    } })
    // Reemplazo como en la app (ModalReemplazarItemDesdeCatalogo): sin cotizaciones → se elimina el original.
    await tx.listaEquipoItem.delete({ where: { id: belden.id } })
    const dixon = await tx.listaEquipoItem.create({ data: {
      id: `lista-item-${randomUUID()}`, listaId: l2.id, proyectoEquipoId: belden.proyectoEquipoId,
      proyectoEquipoItemId: belden.proyectoEquipoItemId, reemplazaProyectoEquipoCotizadoItemId: belden.proyectoEquipoItemId,
      codigo: '8030 LSZH', descripcion: 'CABLE INSTRUMENTACION APANTALLADO 2C X 16AWG, PANTALLA ALUMINIO 100%, DRENAJE 18AWG, CHAQUETA LSZH, 300V, ITC/PLTC, CARRETE 305 M',
      marca: 'DIXON', categoria: 'CABLE INSTRUMENTACIÓN', unidad: 'm', cantidad: 610, presupuesto: 0, orden: 0,
      estado: 'borrador', origen: 'reemplazo', tipoItem: 'equipo',
      comentarioRevision: 'Lazos 4-20 mA transmisores de presión (2 carretes x 305 m; uso 2 x 200 m). Si el proveedor corta a medida: 400 m. Reemplaza al Belden 1492A (2 pares) cotizado.',
      responsableId: l2.responsableId, createdAt: ahora, updatedAt: ahora,
    } })
    if (belden.proyectoEquipoItemId) {
      await tx.proyectoEquipoCotizadoItem.update({ where: { id: belden.proyectoEquipoItemId }, data: {
        estado: 'reemplazado', listaId: l2.id, listaEquipoSeleccionadoId: dixon.id, updatedAt: ahora,
        motivoCambio: 'Reemplazado por Dixon 8030 LSZH 2C 16AWG (1 par por lazo 4-20 mA).',
      } })
    }
  })
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
