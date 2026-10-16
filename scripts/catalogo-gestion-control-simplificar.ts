/**
 * Simplifica los ciclos de GESTION Y CONTROL en el catálogo:
 *  - Reportes semanales (CTL y SSO): una sola tarea "Elaboración y Envío de Reporte Semanal" (2.5 h).
 *  - Valorizaciones (CTL): "Elaboración y Envío de Valorización" (4.5 h) + hitos de espera
 *    "Aprobación de Valorización" (+2 días hábiles) y "Recepción de Conformidad HES" (+5),
 *    etiquetas "Hito+2d" / "Hito+5d", sin horas.
 *  - Borra los servicios "Envío de …" creados el 2026-10-15 si ninguna cotización ni
 *    plantilla los usa (las tareas que los referencian quedan sin servicio: SetNull).
 * Idempotente. Uso: npx dotenv -e .env.production -o -- npx tsx scripts/catalogo-gestion-control-simplificar.ts [--aplicar]
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')
type Cambio = { edt: string; tag: string; desde: string[]; nombre: string; horas: number; tags: string[]; desc: string }
const CAMBIOS: Cambio[] = [
  { edt: 'CTL', tag: 'ReporteAvance', desde: ['Elaboración de Reporte Semanal', 'Elaboración y Envío de Reporte Semanal'], nombre: 'Elaboración y Envío de Reporte Semanal', horas: 2.5, tags: ['ReporteAvance'], desc: 'Elaboración y envío del reporte semanal de avance al cliente (cada viernes).' },
  { edt: 'SSO', tag: 'ReporteSeguridad', desde: ['Elaboración de Reporte Semanal', 'Elaboración y Envío de Reporte Semanal'], nombre: 'Elaboración y Envío de Reporte Semanal', horas: 2.5, tags: ['ReporteSeguridad'], desc: 'Elaboración y envío del reporte semanal de seguridad al cliente (cada viernes).' },
  { edt: 'CTL', tag: 'Valorizaciones', desde: ['Elaboración de Valorización', 'Elaboración y Envío de Valorización'], nombre: 'Elaboración y Envío de Valorización', horas: 4.5, tags: ['Valorizaciones'], desc: 'Elaboración, sustento de metrados y envío de la valorización mensual (día 20).' },
  { edt: 'CTL', tag: 'Valorizaciones', desde: ['Aprobación de Valorización'], nombre: 'Aprobación de Valorización', horas: 0, tags: ['Valorizaciones', 'Hito+2d'], desc: 'Hito: aprobación de la valorización por el cliente, 2 días hábiles después del envío.' },
  { edt: 'CTL', tag: 'Valorizaciones', desde: ['Recepción de Conformidad HES'], nombre: 'Recepción de Conformidad HES', horas: 0, tags: ['Valorizaciones', 'Hito+5d'], desc: 'Hito: recepción de la conformidad HES, 5 días hábiles después del envío.' },
]
const BORRAR = [
  { edt: 'CTL', nombre: 'Envío de Reporte Semanal' },
  { edt: 'SSO', nombre: 'Envío de Reporte Semanal' },
  { edt: 'CTL', nombre: 'Envío de Valorización' },
]

async function main() {
  const servicios = await prisma.catalogoServicio.findMany({
    where: { edt: { nombre: { in: ['CTL', 'SSO'] } }, NOT: { actividadTag: { has: 'Obsoleto' } } },
    include: { edt: { select: { nombre: true } }, _count: { select: { cotizacionServicioItem: true, plantillaServicioItem: true, plantillaServicioItemIndependiente: true, proyectoServicioCotizadoItem: true, proyectoTareas: true } } },
  })
  const actualizar = CAMBIOS.map(c => ({ c, s: servicios.find(s => s.edt.nombre === c.edt && c.desde.includes(s.nombre) && s.actividadTag.includes(c.tag)) }))
  const borrar = BORRAR.map(b => servicios.find(s => s.edt.nombre === b.edt && s.nombre === b.nombre)).filter(Boolean) as typeof servicios
  console.log('ACTUALIZAR')
  for (const { c, s } of actualizar) console.log(s ? `  ${c.edt} ${s.nombre} (${s.horaBase} h) → ${c.nombre} (${c.horas} h) ${JSON.stringify(c.tags)}` : `  ⚠ no encontrado: ${c.edt} ${c.desde[0]}`)
  console.log('BORRAR')
  for (const s of borrar) {
    const usos = s._count.cotizacionServicioItem + s._count.plantillaServicioItem + s._count.plantillaServicioItemIndependiente + s._count.proyectoServicioCotizadoItem
    console.log(`  ${s.edt.nombre} ${s.nombre}${usos ? ` — ⚠ usado en ${usos} cotizaciones/plantillas: NO se borra` : ''} (tareas que quedan sin servicio: ${s._count.proyectoTareas})`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  fs.writeFileSync(`scripts/respaldo-catalogo-gestion-control-simplificar-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ servicios }, null, 2))
  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    for (const { c, s } of actualizar) {
      if (!s) continue
      await tx.catalogoServicio.update({ where: { id: s.id }, data: { nombre: c.nombre, horaBase: c.horas, horaRepetido: c.horas, actividadTag: c.tags, descripcion: `[${c.tag}] ${c.desc}`, updatedAt: ahora } })
    }
    for (const s of borrar) {
      const usos = s._count.cotizacionServicioItem + s._count.plantillaServicioItem + s._count.plantillaServicioItemIndependiente + s._count.proyectoServicioCotizadoItem
      if (!usos) await tx.catalogoServicio.delete({ where: { id: s.id } })
    }
  })
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
