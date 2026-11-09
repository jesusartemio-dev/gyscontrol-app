// Catálogo PRO "Suministro de Equipos" → los 5 pasos estándar (desde CJM52):
//   Cotización y Evaluación Técnica (5 h) → Aprobación Ficha Técnica (1 día, sin
//   horas) → ◆ Emisión de Orden de Compra → Plazo de Entrega del Proveedor →
//   Recepción e Inspección en Almacén GYS
// Renombra los servicios existentes (mantienen su id: las cotizaciones y
// cronogramas pasados guardan su propia copia del nombre) y marca [Obsoleto]
// los que quedan absorbidos. Idempotente.
//   npx tsx scripts/catalogo-pro-cinco-pasos.ts            (muestra)
//   npx tsx scripts/catalogo-pro-cinco-pasos.ts --apply    (guarda)
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--apply')

type Cambio = {
  viejo: string
  nuevo?: string
  horaBase?: number
  horaRepetido?: number
  descripcion?: string
  agregarTags?: string[]
  quitarTags?: string[]
}

const CAMBIOS: Cambio[] = [
  {
    viejo: 'Solicitud de Cotización', nuevo: 'Cotización y Evaluación Técnica', horaBase: 5, horaRepetido: 0,
    descripcion: 'Solicitud de cotizaciones a proveedores, recepción y evaluación técnica de las ofertas.',
  },
  { viejo: 'Recepción de Cotizaciones', agregarTags: ['Obsoleto'] },
  { viejo: 'Evaluación Técnica', agregarTags: ['Obsoleto'] },
  {
    viejo: 'Aprobación del Cliente', nuevo: 'Aprobación Ficha Técnica', quitarTags: ['Hito'],
    descripcion: 'Envío de fichas técnicas al cliente y espera de su aprobación (1 día, sin horas).',
  },
  { viejo: 'Emisión de Orden de Compra', agregarTags: ['Hito'] },
  { viejo: 'Seguimiento de Compra (Expediting)', nuevo: 'Plazo de Entrega del Proveedor' },
  { viejo: 'Recepción en Almacén GYS', nuevo: 'Recepción e Inspección en Almacén GYS' },
]

async function main() {
  const pro = await prisma.edt.findUnique({ where: { nombre: 'PRO' }, select: { id: true } })
  if (!pro) throw new Error('No existe el EDT PRO en el catálogo')
  const servicios = await prisma.catalogoServicio.findMany({
    where: { categoriaId: pro.id },
    select: { id: true, nombre: true, horaBase: true, horaRepetido: true, actividadTag: true },
  })
  console.log(`${APLICAR ? 'APLICANDO' : 'VISTA PREVIA'} — ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'db'}\n`)

  for (const c of CAMBIOS) {
    const s = servicios.find(x => x.nombre === c.viejo) ?? (c.nuevo ? servicios.find(x => x.nombre === c.nuevo) : undefined)
    if (!s) { console.log(`✗ no encontrado: ${c.viejo}`); continue }
    const tags = [...new Set([...s.actividadTag.filter(t => !(c.quitarTags ?? []).includes(t)), ...(c.agregarTags ?? [])])]
    const data = {
      ...(c.nuevo && s.nombre !== c.nuevo ? { nombre: c.nuevo } : {}),
      ...(c.horaBase !== undefined && s.horaBase !== c.horaBase ? { horaBase: c.horaBase } : {}),
      ...(c.horaRepetido !== undefined && s.horaRepetido !== c.horaRepetido ? { horaRepetido: c.horaRepetido } : {}),
      ...(c.descripcion ? { descripcion: c.descripcion } : {}),
      ...(tags.join('|') !== s.actividadTag.join('|') ? { actividadTag: tags } : {}),
    }
    const resumen = Object.entries(data).filter(([k]) => k !== 'descripcion').map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' · ')
    if (!resumen) { console.log(`= ${s.nombre}: ya está`); continue }
    console.log(`→ ${s.nombre}: ${resumen}`)
    if (APLICAR) await prisma.catalogoServicio.update({ where: { id: s.id }, data: { ...data, updatedAt: new Date() } })
  }
  if (!APLICAR) console.log('\nNada guardado. Correr con --apply para aplicar.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
