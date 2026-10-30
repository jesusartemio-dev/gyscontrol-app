/**
 * Alinea `cargoLabel` con el nombre del puesto en plantillas y organigramas ya
 * generados.
 *
 * Desde que el nodo se define por puesto, la etiqueta se escribe desde el
 * catálogo al guardar; este script arrastra los nodos creados antes, que
 * quedaron con el texto viejo ("TECNICO OPERARIO" en vez de "Técnico
 * Operativo"). El organigrama los muestra en mayúsculas por CSS, así que el
 * cambio solo se nota en las listas que muestran el texto crudo.
 *
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/sincronizar-cargolabel-puesto.ts [--aplicar]
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APLICAR = process.argv.includes('--aplicar')
// Los organigramas ya generados son el registro de cada proyecto: renombrarlos
// cambia lo que muestran sus documentos, así que van aparte.
const INCLUIR_PROYECTOS = process.argv.includes('--incluir-proyectos')

async function main() {
  console.log(APLICAR ? '*** APLICANDO ***\n' : '*** SIMULACION (--aplicar para escribir) ***\n')

  const nodosPlantilla = await prisma.plantillaOrgNodo.findMany({
    where: { puestoId: { not: null } },
    include: { puesto: { select: { nombre: true } }, plantilla: { select: { nombre: true } } },
  })

  let plantillaCambios = 0
  for (const n of nodosPlantilla) {
    const esperado = n.puesto!.nombre
    if (n.cargoLabel === esperado) continue
    console.log(`  [${n.plantilla.nombre}] "${n.cargoLabel}" -> "${esperado}"`)
    plantillaCambios++
    if (APLICAR) {
      await prisma.plantillaOrgNodo.update({ where: { id: n.id }, data: { cargoLabel: esperado } })
    }
  }
  console.log(`\nPlantillas: ${plantillaCambios} de ${nodosPlantilla.length} nodos\n`)

  if (!INCLUIR_PROYECTOS) {
    console.log('Organigramas de proyecto: omitidos (usa --incluir-proyectos)')
    return
  }

  const nodosProyecto = await prisma.proyectoOrgNodo.findMany({
    where: { puestoId: { not: null } },
    include: { puesto: { select: { nombre: true } } },
  })

  const resumen = new Map<string, number>()
  let proyectoCambios = 0
  for (const n of nodosProyecto) {
    const esperado = n.puesto!.nombre
    if (n.cargoLabel === esperado) continue
    resumen.set(`"${n.cargoLabel}" -> "${esperado}"`, (resumen.get(`"${n.cargoLabel}" -> "${esperado}"`) ?? 0) + 1)
    proyectoCambios++
    if (APLICAR) {
      await prisma.proyectoOrgNodo.update({ where: { id: n.id }, data: { cargoLabel: esperado } })
    }
  }

  for (const [cambio, n] of [...resumen].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}x  ${cambio}`)
  }
  console.log(`\nOrganigramas de proyecto: ${proyectoCambios} de ${nodosProyecto.length} nodos`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
