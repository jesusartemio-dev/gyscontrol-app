/**
 * Repara nombres de tarea recortados a 45 caracteres por el prefijo de zona
 * ("Bomba - Instalación de bandejas y tuberías co" → "… conduit"): si la tarea
 * viene del catálogo y lo que sigue al "{alias} - " es un PREFIJO del nombre
 * del catálogo, se completa con el nombre del catálogo. Respaldo antes de aplicar.
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-nombres-tarea-recortados.ts [--aplicar]
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

async function main() {
  const tareas = await prisma.proyectoTarea.findMany({
    where: { catalogoServicioId: { not: null } },
    select: {
      id: true, nombre: true,
      catalogoServicio: { select: { nombre: true } },
      proyectoCronograma: { select: { tipo: true, proyecto: { select: { codigo: true } } } },
    },
  })
  const cambios: { id: string; proyecto: string; tipo: string; antes: string; despues: string }[] = []
  for (const t of tareas) {
    const cat = t.catalogoServicio?.nombre
    const m = t.nombre.match(/^(\S+) - (.+)$/)
    // Solo 44-45: el recorte dejaba 45 (44 si cortaba en un espacio). Más cortos
    // son renombres a mano ("Cables - Seguimiento de Compra") y no se tocan.
    if (!cat || !m || t.nombre.length < 44 || t.nombre.length > 45) continue
    const resto = m[2]
    if (resto !== cat && cat.startsWith(resto)) {
      cambios.push({
        id: t.id,
        proyecto: t.proyectoCronograma?.proyecto?.codigo ?? '?',
        tipo: t.proyectoCronograma?.tipo ?? '?',
        antes: t.nombre,
        despues: `${m[1]} - ${cat}`,
      })
    }
  }
  console.log(`Tareas recortadas: ${cambios.length}`)
  for (const c of cambios) console.log(`  ${c.proyecto} [${c.tipo}] "${c.antes}" → "${c.despues}"`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }
  if (!cambios.length) return
  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-nombres-recortados-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(cambios, null, 2))
  await prisma.$transaction(cambios.map(c => prisma.proyectoTarea.update({ where: { id: c.id }, data: { nombre: c.despues, updatedAt: ahora } })))
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
