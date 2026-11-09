// Catálogo CON: servicios de las actividades fijas "Generales - Movilización y
// Obras Preliminares" (al inicio de CON) y "Generales - Desmovilización" (al
// final) — ver src/lib/cronogramaIA/generalesCon.ts. Etiquetas:
//   Movilizacion / Desmovilizacion → a qué actividad va
//   Paralelo → arranca con la anterior, misma predecesora
//   Andamios → solo si alguna zona tiene "Armado de Andamios"
// "el Cliente" en el nombre se reemplaza al generar ("… con NEXA").
// Además marca [Obsoleto] "Preparación y Traslado de Materiales" (lo reemplaza
// "Traslado de Materiales desde Almacén GYS a Planta"). Idempotente.
//   npx tsx scripts/catalogo-con-generales.ts            (muestra)
//   npx tsx scripts/catalogo-con-generales.ts --apply    (guarda)
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { SERVICIOS_GENERALES_CON, SERVICIO_CON_OBSOLETO } from './datos/generales-con'

const APLICAR = process.argv.includes('--apply')

async function main() {
  const con = await prisma.edt.findUnique({ where: { nombre: 'CON' }, select: { id: true } })
  if (!con) throw new Error('No existe el EDT CON')
  const unidad = await prisma.unidadServicio.findFirst({ where: { nombre: 'Evento' }, select: { id: true } })
  if (!unidad) throw new Error('No existe la unidad "Evento"')
  const recursos = new Map((await prisma.recurso.findMany({ select: { id: true, nombre: true } })).map(r => [r.nombre, r.id]))
  const delCon = await prisma.catalogoServicio.findMany({ where: { categoriaId: con.id }, select: { id: true, nombre: true, actividadTag: true } })
  const existentes = new Map(delCon.map(s => [s.nombre, s.id]))
  console.log(`${APLICAR ? 'APLICANDO' : 'VISTA PREVIA'} — ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'db'}\n`)

  for (const s of SERVICIOS_GENERALES_CON) {
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

  const viejo = delCon.find(s => s.nombre === SERVICIO_CON_OBSOLETO)
  if (!viejo) console.log(`\n✗ no encontrado: ${SERVICIO_CON_OBSOLETO}`)
  else if (viejo.actividadTag.some(t => /^obsoleto$/i.test(t))) console.log(`\n= ${SERVICIO_CON_OBSOLETO}: ya está [Obsoleto]`)
  else {
    console.log(`\n→ ${SERVICIO_CON_OBSOLETO}: + [Obsoleto]`)
    if (APLICAR) await prisma.catalogoServicio.update({ where: { id: viejo.id }, data: { actividadTag: [...viejo.actividadTag, 'Obsoleto'], updatedAt: new Date() } })
  }
  if (!APLICAR) console.log('\nNada guardado. Correr con --apply para aplicar.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
