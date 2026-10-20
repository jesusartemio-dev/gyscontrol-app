/**
 * Corrige erratas en los nombres de actividades y tareas de la Línea Base de un
 * proyecto (tildes, "Soprotes", "Torre -Armado"…). Guarda respaldo antes de aplicar.
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-erratas-cjm50.ts [--proyecto=CJM50] [--aplicar]
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'

const args = process.argv.slice(2)
const APLICAR = args.includes('--aplicar')
const PROYECTO = args.find(a => a.startsWith('--proyecto='))?.split('=')[1] ?? 'CJM50'

// Palabra completa (sin distinguir mayúsculas) → corrección.
const PALABRAS: Record<string, string> = {
  soprotes: 'Soportes',
  alinieacion: 'Alineación',
  alineacion: 'Alineación',
  medicion: 'Medición',
  fabricacion: 'Fabricación',
  instalacion: 'Instalación',
  tuberia: 'Tubería',
  tuberias: 'Tuberías',
  recepcion: 'Recepción',
  evaluacion: 'Evaluación',
  tecnica: 'Técnica',
  cotizacion: 'Cotización',
  emision: 'Emisión',
  aprobacion: 'Aprobación',
}

function corregir(nombre: string): string {
  let s = nombre.replace(/\b([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\b/g, w => {
    const c = PALABRAS[w.toLowerCase()]
    if (!c) return w
    return w[0] === w[0].toLowerCase() ? c.toLowerCase() : c
  })
  s = s.replace(/\s+-(?=\S)/g, ' - ') // "Torre -Armado" → "Torre - Armado"
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')') // "( 1 cuerpo)" → "(1 cuerpo)"
  s = s.replace(/\((\d+) cuerpos?\)/gi, (_, n) => `(${n} ${n === '1' ? 'Cuerpo' : 'Cuerpos'})`)
  return s.replace(/\s{2,}/g, ' ').trim()
}

async function main() {
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: PROYECTO } }, select: { id: true } })
  const acts = await prisma.proyectoActividad.findMany({ where: { proyectoCronogramaId: cron.id }, select: { id: true, nombre: true } })
  const tareas = await prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: cron.id }, select: { id: true, nombre: true } })
  const cambiosA = acts.map(a => ({ ...a, nuevo: corregir(a.nombre) })).filter(a => a.nuevo !== a.nombre)
  const cambiosT = tareas.map(t => ({ ...t, nuevo: corregir(t.nombre) })).filter(t => t.nuevo !== t.nombre)

  console.log(`${PROYECTO} — Línea Base`)
  console.log(`Actividades (${cambiosA.length}):`)
  for (const a of cambiosA) console.log(`  ${a.nombre}  →  ${a.nuevo}`)
  console.log(`Tareas (${cambiosT.length}):`)
  for (const t of cambiosT) console.log(`  ${t.nombre}  →  ${t.nuevo}`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-erratas-${PROYECTO}-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ actividades: cambiosA, tareas: cambiosT }, null, 2))
  await prisma.$transaction([
    ...cambiosA.map(a => prisma.proyectoActividad.update({ where: { id: a.id }, data: { nombre: a.nuevo, updatedAt: ahora } })),
    ...cambiosT.map(t => prisma.proyectoTarea.update({ where: { id: t.id }, data: { nombre: t.nuevo, updatedAt: ahora } })),
  ])
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
