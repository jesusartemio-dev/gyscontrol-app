/**
 * Catálogo de la fase GESTION Y CONTROL con tareas recurrentes:
 *  - CTL → descripción "Control": Reporte Avance Semanal (Elaboración/Envío, cada viernes)
 *    y Valorizaciones (Elaboración/Envío/Aprobación/Recepción HES, cada día 20).
 *  - SSO nuevo "Gestión de Seguridad": Habilitación de Personal (una vez) y
 *    Reporte Semanal de Seguridad (Elaboración/Envío, cada viernes).
 *  - Servicios anteriores (CTL y "Habilitación HSE de Personal" de SEG): etiqueta
 *    [Obsoleto] y nombre "(anterior)". Siguen en el catálogo por las cotizaciones
 *    pasadas (que guardan su propio nombre), pero el generador ya no los usa.
 * El generador repite y numera los recurrentes (ver construirEstructuraReal).
 * Idempotente. Uso: npx dotenv -e .env.production -o -- npx tsx scripts/catalogo-gestion-control-ciclos.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')
const ANTERIORES = ['Reunión y Reporte Semanal de Avance', 'Valorizaciones y Conformidad HES', 'Elaboración de Reporte Semanal', 'Habilitación HSE de Personal']

type Nuevo = { edt: 'CTL' | 'SSO'; nombre: string; tag: string; unidad: 'Documento' | 'Evento'; horas: number; nota: string | null; desc: string }
const NUEVOS: Nuevo[] = [
  { edt: 'CTL', nombre: 'Elaboración de Reporte Semanal', tag: 'ReporteAvance', unidad: 'Documento', horas: 2, nota: 'semanas de proyecto', desc: 'Elaboración del reporte semanal de avance para el cliente (cada viernes).' },
  { edt: 'CTL', nombre: 'Envío de Reporte Semanal', tag: 'ReporteAvance', unidad: 'Evento', horas: 0.5, nota: 'semanas de proyecto', desc: 'Envío del reporte semanal de avance al cliente (mismo viernes).' },
  { edt: 'CTL', nombre: 'Elaboración de Valorización', tag: 'Valorizaciones', unidad: 'Documento', horas: 4, nota: 'valorizaciones intermedias', desc: 'Elaboración de la valorización mensual y sustento de metrados (día 20).' },
  { edt: 'CTL', nombre: 'Envío de Valorización', tag: 'Valorizaciones', unidad: 'Evento', horas: 0.5, nota: 'valorizaciones intermedias', desc: 'Envío de la valorización al cliente (mismo día).' },
  { edt: 'CTL', nombre: 'Aprobación de Valorización', tag: 'Valorizaciones', unidad: 'Evento', horas: 0.5, nota: 'valorizaciones intermedias', desc: 'Seguimiento de la aprobación de la valorización por el cliente.' },
  { edt: 'CTL', nombre: 'Recepción de Conformidad HES', tag: 'Valorizaciones', unidad: 'Evento', horas: 0.5, nota: 'valorizaciones intermedias', desc: 'Recepción de la conformidad HES de la valorización.' },
  { edt: 'SSO', nombre: 'Solicitud de Validación de OC', tag: 'Habilitacion', unidad: 'Evento', horas: 1, nota: null, desc: 'Solicitud de validación de la OC para el ingreso del personal.' },
  { edt: 'SSO', nombre: 'Solicitud Ingreso Personal SPOT', tag: 'Habilitacion', unidad: 'Evento', horas: 1, nota: null, desc: 'Solicitud de ingreso del personal en SPOT.' },
  { edt: 'SSO', nombre: 'Habilitación de Personal Sistema Rainbow', tag: 'Habilitacion', unidad: 'Evento', horas: 1, nota: null, desc: 'Habilitación del personal en el sistema Rainbow.' },
  { edt: 'SSO', nombre: 'Elaboración de Reporte Semanal', tag: 'ReporteSeguridad', unidad: 'Documento', horas: 2, nota: 'semanas de proyecto', desc: 'Elaboración del reporte semanal de seguridad (cada viernes).' },
  { edt: 'SSO', nombre: 'Envío de Reporte Semanal', tag: 'ReporteSeguridad', unidad: 'Evento', horas: 0.5, nota: 'semanas de proyecto', desc: 'Envío del reporte semanal de seguridad al cliente (mismo viernes).' },
]
const RECURSO: Record<'CTL' | 'SSO', string> = { CTL: 'Gestor', SSO: 'SSOMA' }

async function main() {
  const faseGC = await prisma.faseDefault.findUniqueOrThrow({ where: { nombre: 'GESTION Y CONTROL' } })
  const ctl = await prisma.edt.findUniqueOrThrow({ where: { nombre: 'CTL' } })
  const ssoExistente = await prisma.edt.findUnique({ where: { nombre: 'SSO' } })
  const unidades = new Map((await prisma.unidadServicio.findMany()).map(u => [u.nombre, u.id]))
  const recursos = new Map((await prisma.recurso.findMany({ where: { nombre: { in: ['Gestor', 'SSOMA'] } } })).map(r => [r.nombre, r.id]))
  // Anteriores: los de CTL y la habilitación de SEG, que todavía no están marcados.
  const anteriores = await prisma.catalogoServicio.findMany({
    // Nunca los nuevos (uno se llama igual que un anterior): esos llevan la etiqueta de su actividad.
    where: { nombre: { in: ANTERIORES }, edt: { nombre: { in: ['CTL', 'SEG'] } }, NOT: [{ actividadTag: { has: 'Obsoleto' } }, { actividadTag: { hasSome: [...new Set(NUEVOS.map(n => n.tag))] } }] },
    select: { id: true, nombre: true, descripcion: true, actividadTag: true, categoriaId: true, edt: { select: { nombre: true } } },
  })
  const idsAnteriores = new Set(anteriores.map(a => a.id))
  const existentes = (await prisma.catalogoServicio.findMany({ where: { edt: { nombre: { in: ['CTL', 'SSO'] } } }, select: { id: true, nombre: true, categoriaId: true, actividadTag: true } }))
    .filter(e => !idsAnteriores.has(e.id))
  const yaCreado = (n: Nuevo, edtId?: string) => existentes.some(e => e.nombre === n.nombre && e.categoriaId === edtId && !e.actividadTag.includes('Obsoleto'))

  console.log('EDTS')
  console.log(`  CTL: descripción "${ctl.descripcion}" → "Control"`)
  console.log(ssoExistente ? '  SSO ya existe' : '  + SSO "Gestión de Seguridad" → GESTION Y CONTROL (orden 1)')
  console.log('SERVICIOS ANTERIORES → [Obsoleto], nombre "(anterior)"')
  for (const a of anteriores) console.log(`  ${a.edt.nombre} | ${a.nombre}`)
  console.log('SERVICIOS NUEVOS')
  for (const n of NUEVOS) {
    const edtId = n.edt === 'CTL' ? ctl.id : ssoExistente?.id
    console.log(`  ${yaCreado(n, edtId) ? '=' : '+'} ${n.edt} [${n.tag}] ${n.nombre} — ${n.horas} h, ${RECURSO[n.edt]}, ${n.unidad}${n.nota ? `, cantidad: ${n.nota}` : ''}`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  for (const u of ['Documento', 'Evento']) if (!unidades.get(u)) throw new Error(`Falta la unidad ${u}`)
  for (const r of ['Gestor', 'SSOMA']) if (!recursos.get(r)) throw new Error(`Falta el recurso ${r}`)
  fs.writeFileSync(`scripts/respaldo-catalogo-gestion-control-ciclos-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    JSON.stringify({ ctl, ssoExistente, anteriores }, null, 2))
  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.edt.update({ where: { id: ctl.id }, data: { descripcion: 'Control' } })
    const sso = ssoExistente ?? await tx.edt.create({ data: { nombre: 'SSO', descripcion: 'Gestión de Seguridad', faseDefaultId: faseGC.id, orden: 1 } })
    // Primero renombrar los anteriores (uno se llama igual que un servicio nuevo).
    for (const a of anteriores) {
      await tx.catalogoServicio.update({ where: { id: a.id }, data: {
        nombre: `${a.nombre} (anterior)`,
        actividadTag: ['Obsoleto'],
        descripcion: `[Obsoleto] ${a.descripcion.replace(/^\[[^\]]*\]\s*/, '')}`,
        updatedAt: ahora,
      } })
    }
    let orden = 1
    for (const n of NUEVOS) {
      const edtId = n.edt === 'CTL' ? ctl.id : sso.id
      if (yaCreado(n, edtId)) { orden++; continue }
      await tx.catalogoServicio.create({ data: {
        id: randomUUID(), categoriaId: edtId, unidadServicioId: unidades.get(n.unidad)!, recursoId: recursos.get(RECURSO[n.edt])!,
        nombre: n.nombre, descripcion: `[${n.tag}] ${n.desc}`, horaBase: n.horas, horaRepetido: n.horas,
        orden: orden++, cantidad: 1, nivelDificultad: 1, actividadTag: [n.tag], filtroAlcance: 'general', notaCantidad: n.nota, updatedAt: ahora,
      } })
    }
  })
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
