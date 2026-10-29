/**
 * Copia el recurso (ProyectoTarea.recursoId) de cada tarea del cronograma de
 * PLANIFICACIÓN (línea base) a la tarea equivalente del cronograma de
 * EJECUCIÓN del mismo proyecto. Empareja por la ruta
 * "fase › EDT › actividad › tarea"; si una ruta se repite o falta en algún
 * lado, esa tarea no se toca y se informa.
 *
 * Solo cambia recursoId (y updatedAt). Por defecto es vista previa; con
 * --aplicar escribe y antes guarda un respaldo JSON en scripts/backups/.
 *
 * Uso (producción):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/sincronizar-recursos-planificacion-a-ejecucion.ts CJM50 [--aplicar]
 */
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

const codigo = process.argv[2]
const aplicar = process.argv.includes('--aplicar')

async function tareasDe(proyectoId: string, tipo: 'planificacion' | 'ejecucion') {
  const crono = await prisma.proyectoCronograma.findFirst({ where: { proyectoId, tipo }, select: { id: true, nombre: true } })
  if (!crono) throw new Error(`El proyecto no tiene cronograma de ${tipo}`)
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoActividad: { proyectoEdt: { proyectoCronogramaId: crono.id } } },
    select: {
      id: true, nombre: true, recursoId: true, recurso: { select: { nombre: true } },
      proyectoActividad: { select: { nombre: true, proyectoEdt: { select: { nombre: true, proyectoFase: { select: { nombre: true } } } } } },
    },
  })
  const porRuta = new Map<string, typeof tareas>()
  for (const t of tareas) {
    const a = t.proyectoActividad
    const ruta = `${a.proyectoEdt.proyectoFase?.nombre ?? ''} › ${a.proyectoEdt.nombre} › ${a.nombre} › ${t.nombre}`
    porRuta.set(ruta, [...(porRuta.get(ruta) ?? []), t])
  }
  return { crono, total: tareas.length, porRuta }
}

async function main() {
  if (!codigo) throw new Error('Uso: tsx scripts/sincronizar-recursos-planificacion-a-ejecucion.ts <codigoProyecto> [--aplicar]')
  const proyecto = await prisma.proyecto.findFirst({ where: { codigo }, select: { id: true, codigo: true, nombre: true } })
  if (!proyecto) throw new Error(`Proyecto ${codigo} no encontrado`)
  const [base, ejec] = await Promise.all([tareasDe(proyecto.id, 'planificacion'), tareasDe(proyecto.id, 'ejecucion')])
  console.log(`${proyecto.codigo} — ${proyecto.nombre}`)
  console.log(`Planificación "${base.crono.nombre}": ${base.total} tareas | Ejecución "${ejec.crono.nombre}": ${ejec.total} tareas\n`)

  const cambios: { id: string; ruta: string; antes: string | null; antesNombre: string; despues: string | null; despuesNombre: string }[] = []
  const omitidas: string[] = []
  for (const [ruta, enBase] of base.porRuta) {
    const enEjec = ejec.porRuta.get(ruta)
    if (!enEjec) { omitidas.push(`solo en planificación: ${ruta}`); continue }
    if (enBase.length > 1 || enEjec.length > 1) { omitidas.push(`ruta repetida (${enBase.length}/${enEjec.length}): ${ruta}`); continue }
    const b = enBase[0], e = enEjec[0]
    if (b.recursoId === e.recursoId) continue
    cambios.push({ id: e.id, ruta, antes: e.recursoId, antesNombre: e.recurso?.nombre ?? '(sin recurso)', despues: b.recursoId, despuesNombre: b.recurso?.nombre ?? '(sin recurso)' })
  }
  for (const ruta of ejec.porRuta.keys()) if (!base.porRuta.has(ruta)) omitidas.push(`solo en ejecución: ${ruta}`)

  for (const c of cambios) console.log(`CAMBIA: ${c.ruta}\n        ${c.antesNombre} → ${c.despuesNombre}`)
  for (const o of omitidas) console.log(`OMITIDA: ${o}`)
  console.log(`\n${cambios.length} tarea(s) a actualizar, ${omitidas.length} omitida(s).`)

  if (!aplicar || cambios.length === 0) {
    if (!aplicar && cambios.length > 0) console.log('Vista previa — no se escribió nada. Agregar --aplicar para guardar.')
    return
  }
  const dir = path.join(process.cwd(), 'scripts', 'backups')
  fs.mkdirSync(dir, { recursive: true })
  const respaldo = path.join(dir, `recursos-ejecucion-${proyecto.codigo}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(respaldo, JSON.stringify(cambios.map(c => ({ id: c.id, ruta: c.ruta, recursoIdAnterior: c.antes, recursoNombreAnterior: c.antesNombre })), null, 2))
  console.log(`Respaldo: ${respaldo}`)

  await prisma.$transaction(cambios.map(c => prisma.proyectoTarea.update({ where: { id: c.id }, data: { recursoId: c.despues, updatedAt: new Date() } })))
  console.log(`✅ ${cambios.length} tarea(s) de ejecución actualizadas.`)
}

main()
  .catch(e => { console.error('❌', e instanceof Error ? e.message : e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
