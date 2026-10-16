/**
 * Catálogo de Procura: PRO = "Suministro de Equipos" (materiales) y EDT nuevo
 * SER "Servicios y Alquileres" (fase PROCURA) con los pasos de gestión:
 *   Alquiler:    Solicitud → Recepción → Evaluación → Emisión OS → Movilización → Desmovilización
 *   Subcontrato: Solicitud → Recepción → Evaluación → Emisión OS → Habilitación Subcontratista → Desmovilización → Conformidad
 * El generador elige los pasos por la etiqueta "Alquiler"/"Subcontrato" (separarServiciosAlquileres.ts).
 * También renombra PLA → "Planos de Ingeniería" y CIE → "Cierre del Proyecto".
 * Con --proyecto=CJM50 renombra esos EDT también en ese proyecto.
 * Idempotente. Uso: npx dotenv -e .env.production -o -- npx tsx scripts/catalogo-servicios-alquileres.ts [--proyecto=CJM50] [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')
const PROYECTO = process.argv.find(a => a.startsWith('--proyecto='))?.split('=')[1]
const NOMBRES: Record<string, string> = { PLA: 'Planos de Ingeniería', PRO: 'Suministro de Equipos', CIE: 'Cierre del Proyecto' }
type Servicio = { nombre: string; tags: string[]; unidad: 'Evento' | 'Documento'; horas: number; desc: string }
const SERVICIOS: Servicio[] = [
  { nombre: 'Solicitud de Cotización', tags: ['Alquiler', 'Subcontrato'], unidad: 'Evento', horas: 2, desc: 'Solicitud de cotización a proveedores del servicio o alquiler.' },
  { nombre: 'Recepción de Cotizaciones', tags: ['Alquiler', 'Subcontrato'], unidad: 'Evento', horas: 1, desc: 'Recepción y comparación de cotizaciones.' },
  { nombre: 'Evaluación Técnica', tags: ['Alquiler', 'Subcontrato'], unidad: 'Evento', horas: 1, desc: 'Evaluación técnica y comercial de las propuestas.' },
  { nombre: 'Emisión de Orden de Servicio', tags: ['Alquiler', 'Subcontrato'], unidad: 'Documento', horas: 1, desc: 'Emisión de la orden de servicio al proveedor elegido.' },
  { nombre: 'Movilización a Obra', tags: ['Alquiler'], unidad: 'Evento', horas: 1, desc: 'Coordinación de la llegada del equipo alquilado a obra.' },
  { nombre: 'Habilitación Subcontratista', tags: ['Subcontrato'], unidad: 'Evento', horas: 1, desc: 'Habilitación del personal del subcontratista para ingresar a obra.' },
  { nombre: 'Desmovilización', tags: ['Alquiler', 'Subcontrato'], unidad: 'Evento', horas: 1, desc: 'Coordinación del retiro del equipo o del subcontratista al terminar.' },
  { nombre: 'Conformidad del Servicio', tags: ['Subcontrato'], unidad: 'Documento', horas: 1, desc: 'Conformidad del servicio prestado por el subcontratista.' },
]

async function main() {
  const procura = await prisma.faseDefault.findUniqueOrThrow({ where: { nombre: 'PROCURA' } })
  const edts = await prisma.edt.findMany({ where: { nombre: { in: [...Object.keys(NOMBRES), 'SER'] } } })
  const ser = edts.find(e => e.nombre === 'SER')
  const existentes = ser ? await prisma.catalogoServicio.findMany({ where: { categoriaId: ser.id }, select: { nombre: true } }) : []
  const unidades = new Map((await prisma.unidadServicio.findMany()).map(u => [u.nombre, u.id]))
  const gestor = await prisma.recurso.findFirstOrThrow({ where: { nombre: 'Gestor' }, select: { id: true } })
  const proyecto = PROYECTO ? await prisma.proyecto.findFirstOrThrow({ where: { codigo: PROYECTO }, select: { id: true } }) : null

  console.log('NOMBRES')
  for (const [cod, nombre] of Object.entries(NOMBRES)) console.log(`  ${cod}: "${edts.find(e => e.nombre === cod)?.descripcion}" → "${nombre}"${proyecto ? ` (catálogo y ${PROYECTO})` : ' (catálogo)'}`)
  console.log(ser ? 'EDT SER ya existe' : '+ EDT SER "Servicios y Alquileres" → PROCURA (orden 1)')
  for (const s of SERVICIOS) console.log(`  ${existentes.some(e => e.nombre === s.nombre) ? '=' : '+'} ${s.nombre} — ${s.horas} h, Gestor [${s.tags.join(', ')}]`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  fs.writeFileSync(`scripts/respaldo-catalogo-servicios-alquileres-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ edts }, null, 2))
  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    for (const [cod, nombre] of Object.entries(NOMBRES)) {
      await tx.edt.update({ where: { nombre: cod }, data: { descripcion: nombre } })
      if (proyecto) await tx.proyectoEdt.updateMany({ where: { proyectoId: proyecto.id, edt: { nombre: cod } }, data: { nombre, updatedAt: ahora } })
    }
    const edtSer = ser ?? await tx.edt.create({ data: { nombre: 'SER', descripcion: 'Servicios y Alquileres', faseDefaultId: procura.id, orden: 1 } })
    let orden = 1
    for (const s of SERVICIOS) {
      if (existentes.some(e => e.nombre === s.nombre)) { orden++; continue }
      await tx.catalogoServicio.create({ data: {
        id: randomUUID(), categoriaId: edtSer.id, unidadServicioId: unidades.get(s.unidad)!, recursoId: gestor.id,
        nombre: s.nombre, descripcion: `[${s.tags.join(', ')}] ${s.desc}`, horaBase: s.horas, horaRepetido: s.horas,
        orden: orden++, cantidad: 1, nivelDificultad: 1, actividadTag: s.tags, filtroAlcance: 'general', notaCantidad: null, updatedAt: ahora,
      } })
    }
  })
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
