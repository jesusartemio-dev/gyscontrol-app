/**
 * Completa CuentaPorCobrar.ordenCompraCliente con la OC de su proyecto
 * (Proyecto.ordenCompraCliente — una sola OC por proyecto) en las CxC que
 * hoy la tienen vacía. Hasta este cambio, la CxC creada al facturar una
 * valorización heredaba HES/Guía pero NO la OC, así que no aparecía al
 * buscar por OC en Cuentas por Cobrar.
 *
 * Solo llena vacíos: nunca pisa una OC ya cargada (a mano o por import).
 * No toca updatedAt — es un relleno de datos, no una edición del usuario.
 *
 * SIMULACRO POR DEFECTO: sin --ejecutar no escribe nada, solo imprime.
 *
 *   Simulacro:  npx dotenv -e .env.production -o -- npx tsx scripts/backfill-oc-cuentas-cobrar.ts
 *   De verdad:  npx dotenv -e .env.production -o -- npx tsx scripts/backfill-oc-cuentas-cobrar.ts --ejecutar
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const ejecutar = process.argv.includes('--ejecutar')

  const candidatas = await prisma.cuentaPorCobrar.findMany({
    where: {
      OR: [{ ordenCompraCliente: null }, { ordenCompraCliente: '' }],
      proyecto: { ordenCompraCliente: { not: null } },
    },
    select: {
      id: true,
      numeroDocumento: true,
      descripcion: true,
      estado: true,
      valorizacionId: true,
      proyecto: { select: { codigo: true, ordenCompraCliente: true } },
    },
    orderBy: [{ proyecto: { codigo: 'asc' } }, { fechaEmision: 'asc' }],
  })

  const aActualizar = candidatas.filter(c => c.proyecto.ordenCompraCliente?.trim())
  const sinOcEnProyecto = await prisma.cuentaPorCobrar.count({
    where: {
      OR: [{ ordenCompraCliente: null }, { ordenCompraCliente: '' }],
      proyecto: { OR: [{ ordenCompraCliente: null }, { ordenCompraCliente: '' }] },
    },
  })

  console.log(`CxC sin OC que se pueden completar desde su proyecto: ${aActualizar.length}`)
  for (const c of aActualizar) {
    const origen = c.valorizacionId ? 'valorización' : 'otra'
    console.log(
      `  ${c.proyecto.codigo.padEnd(8)} OC ${c.proyecto.ordenCompraCliente!.trim().padEnd(14)} ` +
      `${(c.numeroDocumento ?? '(sin N°)').padEnd(14)} ${c.estado.padEnd(10)} ${origen.padEnd(12)} ${c.descripcion ?? ''}`
    )
  }
  console.log(`\nCxC sin OC cuyo proyecto TAMPOCO tiene OC (no se tocan; hay que cargarla en el proyecto): ${sinOcEnProyecto}`)

  if (!ejecutar) {
    console.log('\nSIMULACRO — no se escribió nada. Corre con --ejecutar para aplicar.')
    return
  }

  let actualizadas = 0
  for (const c of aActualizar) {
    // El where repite la condición de "vacía" para no pisar una OC cargada
    // entre la lectura y la escritura.
    const r = await prisma.cuentaPorCobrar.updateMany({
      where: { id: c.id, OR: [{ ordenCompraCliente: null }, { ordenCompraCliente: '' }] },
      data: { ordenCompraCliente: c.proyecto.ordenCompraCliente!.trim() },
    })
    actualizadas += r.count
  }
  console.log(`\nActualizadas: ${actualizadas}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
