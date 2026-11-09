// Solo lectura: cómo está la Procura (EDT PRO y SER) de un proyecto y qué
// servicios de PRO tiene el catálogo. Uso: npx tsx scripts/check-pro-estructura.ts <proyectoId>
import { prisma } from '../src/lib/prisma'

async function main() {
  const proyectoId = process.argv[2]
  const proy = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { codigo: true, nombre: true } })
  console.log('Proyecto:', proy)
  const crons = await prisma.proyectoCronograma.findMany({ where: { proyectoId }, select: { id: true, tipo: true } })
  for (const c of crons) {
    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoId, proyectoCronogramaId: c.id, edt: { nombre: { in: ['PRO', 'SER'] } } },
      select: { id: true, nombre: true, edt: { select: { nombre: true } } },
    })
    for (const e of edts) {
      console.log(`\n=== [${c.tipo}] ${e.edt.nombre} · ${e.nombre}`)
      const acts = await prisma.proyectoActividad.findMany({ where: { proyectoEdtId: e.id }, orderBy: { orden: 'asc' }, select: { id: true, nombre: true } })
      for (const a of acts) {
        const tareas = await prisma.proyectoTarea.findMany({
          where: { proyectoActividadId: a.id },
          orderBy: { orden: 'asc' },
          select: {
            nombre: true, horasEstimadas: true, esHito: true, fechaInicio: true, fechaFin: true,
            recurso: { select: { nombre: true } }, catalogoServicio: { select: { nombre: true } },
            dependenciasComoDependiente: { select: { tipo: true, lagMinutos: true, tareaOrigen: { select: { nombre: true } } } },
          },
        })
        console.log(`  ACT ${a.nombre} (${tareas.length})`)
        for (const t of tareas) {
          const deps = t.dependenciasComoDependiente.map(d => `${d.tareaOrigen.nombre}${d.lagMinutos ? ` ${d.lagMinutos / 60}h` : ''}`).join(' | ')
          console.log(`    - ${t.esHito ? '◆ ' : ''}${t.nombre} · ${t.horasEstimadas ?? 0}h · ${t.recurso?.nombre ?? '-'} · cat:${t.catalogoServicio?.nombre ?? '-'} · ${t.fechaInicio.toISOString().slice(0, 16)}→${t.fechaFin.toISOString().slice(0, 16)}${deps ? ` · deps: ${deps}` : ''}`)
        }
      }
    }
  }
  const cat = await prisma.catalogoServicio.findMany({
    where: { edt: { nombre: { in: ['PRO', 'SER'] } } },
    orderBy: [{ categoriaId: 'asc' }, { orden: 'asc' }],
    select: { nombre: true, horaBase: true, horaRepetido: true, orden: true, actividadTag: true, filtroAlcance: true, edt: { select: { nombre: true } }, recurso: { select: { nombre: true } } },
  })
  console.log('\n=== Catálogo PRO/SER')
  for (const s of cat) console.log(`  ${s.edt.nombre} #${s.orden} ${s.nombre} · base ${s.horaBase} rep ${s.horaRepetido} · ${s.recurso.nombre} · tags [${s.actividadTag.join(', ')}] · ${s.filtroAlcance}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
