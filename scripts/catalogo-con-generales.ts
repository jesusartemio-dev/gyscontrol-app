// Catálogo CON: servicios de las actividades fijas "Generales - Movilización y
// Obras Preliminares" (al inicio de CON) y "Generales - Desmovilización" (al
// final) — ver src/lib/cronogramaIA/generalesCon.ts. Etiquetas:
//   Movilizacion / Desmovilizacion → a qué actividad va
//   Paralelo → arranca con la anterior, misma predecesora
//   Andamios → solo si alguna zona tiene "Armado de Andamios"
// "{CLIENTE}" en el nombre se reemplaza al generar ("… con NEXA").
// Idempotente (por nombre dentro de CON).
//   npx tsx scripts/catalogo-con-generales.ts            (muestra)
//   npx tsx scripts/catalogo-con-generales.ts --apply    (guarda)
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--apply')

const SERVICIOS: { orden: number; nombre: string; recurso: string; horas: number; tags: string[]; descripcion: string }[] = [
  { orden: 100, nombre: 'Movilización de Personal, Equipos y Herramientas a Planta', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Movilizacion'], descripcion: 'Traslado del personal, equipos y herramientas a la planta del cliente al inicio de la obra.' },
  { orden: 101, nombre: 'Reconocimiento de Zonas de Trabajo y Replanteo con {CLIENTE}', recurso: 'Supervisor', horas: 4, tags: ['Movilizacion'], descripcion: 'Recorrido de las zonas de trabajo y replanteo junto con el cliente.' },
  { orden: 102, nombre: 'Habilitación de Zona de Acopio y Almacén Temporal en Planta', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Movilizacion'], descripcion: 'Habilitación del área de acopio y almacén temporal de materiales en planta.' },
  { orden: 103, nombre: 'Traslado de Materiales desde Almacén GYS a Planta', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Movilizacion'], descripcion: 'Traslado de los materiales desde el almacén de GYS hasta la zona de acopio en planta.' },
  { orden: 104, nombre: 'Recepción y Traslado de Andamios a Planta', recurso: 'Cuadrilla 2P', horas: 3, tags: ['Movilizacion', 'Paralelo', 'Andamios'], descripcion: 'Recepción de los andamios alquilados y traslado a la zona de trabajo.' },
  { orden: 105, nombre: 'Señalización y Delimitación de Áreas de Trabajo', recurso: 'Cuadrilla 2P', horas: 2, tags: ['Movilizacion', 'Paralelo'], descripcion: 'Señalización y delimitación de las áreas de trabajo antes de iniciar las actividades.' },
  { orden: 110, nombre: 'Devolución de Andamios', recurso: 'Cuadrilla 2P', horas: 3, tags: ['Desmovilizacion', 'Andamios'], descripcion: 'Desarmado final y devolución de los andamios alquilados.' },
  { orden: 111, nombre: 'Retiro de Sobrantes, Residuos y Almacén Temporal', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Desmovilizacion'], descripcion: 'Retiro de materiales sobrantes, residuos y del almacén temporal en planta.' },
  { orden: 112, nombre: 'Desmovilización de Personal, Equipos y Herramientas', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Desmovilizacion'], descripcion: 'Retiro del personal, equipos y herramientas de la planta al cierre de la obra.' },
  { orden: 113, nombre: 'Liberación General de Áreas con {CLIENTE} (acta)', recurso: 'Supervisor', horas: 2, tags: ['Desmovilizacion'], descripcion: 'Entrega y liberación de las áreas de trabajo al cliente con acta firmada.' },
]

async function main() {
  const con = await prisma.edt.findUnique({ where: { nombre: 'CON' }, select: { id: true } })
  if (!con) throw new Error('No existe el EDT CON')
  const unidad = await prisma.unidadServicio.findFirst({ where: { nombre: 'Evento' }, select: { id: true } })
  if (!unidad) throw new Error('No existe la unidad "Evento"')
  const recursos = new Map((await prisma.recurso.findMany({ select: { id: true, nombre: true } })).map(r => [r.nombre, r.id]))
  const existentes = new Map((await prisma.catalogoServicio.findMany({ where: { categoriaId: con.id }, select: { id: true, nombre: true } })).map(s => [s.nombre, s.id]))
  console.log(`${APLICAR ? 'APLICANDO' : 'VISTA PREVIA'} — ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'db'}\n`)

  for (const s of SERVICIOS) {
    const recursoId = recursos.get(s.recurso)
    if (!recursoId) { console.log(`✗ falta el recurso "${s.recurso}" para ${s.nombre}`); continue }
    const data = {
      nombre: s.nombre, descripcion: s.descripcion, horaBase: s.horas, horaRepetido: 0, orden: s.orden, cantidad: 1,
      nivelDificultad: 1, actividadTag: s.tags, recursoId, unidadServicioId: unidad.id, updatedAt: new Date(),
    }
    const id = existentes.get(s.nombre)
    console.log(`${id ? '= actualiza' : '+ crea    '} #${s.orden} ${s.nombre} · ${s.horas} h · ${s.recurso} · [${s.tags.join(', ')}]`)
    if (!APLICAR) continue
    if (id) await prisma.catalogoServicio.update({ where: { id }, data })
    else await prisma.catalogoServicio.create({ data: { id: randomUUID(), categoriaId: con.id, filtroAlcance: 'general', ...data } })
  }
  if (!APLICAR) console.log('\nNada guardado. Correr con --apply para aplicar.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
