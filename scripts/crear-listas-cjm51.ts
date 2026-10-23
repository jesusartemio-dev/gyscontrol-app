/**
 * CJM51 — crea una lista de equipos por cada familia de PROCURA del cronograma
 * (+ alquiler de andamios), con los ítems de los equipos cotizados, igual que
 * "distribuir" de la app: cada ítem queda enlazado a su ítem cotizado (en_lista).
 *  - Responsable: Jesús Mamani. Estado: borrador.
 *  - Fecha necesaria: la "Recepción en Almacén GYS" de esa familia en la Línea Base
 *    (andamios: su Movilización a Obra).
 *  - Catálogo: se enlaza la ficha si el ítem cotizado ya la tiene o si existe una con el mismo código.
 *  - "MATERIALES VARIOS" (globales) no se asignan: quedan pendientes en cotizados.
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/crear-listas-cjm51.ts [--aplicar]
 */
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { crearEvento } from '../src/lib/utils/trazabilidad'

const APLICAR = process.argv.includes('--aplicar')
const LISTAS: { nombre: string; actividad: string; codigos: string[]; servicio?: boolean }[] = [
  { nombre: 'Cables de Fuerza y Control', actividad: 'Cables de Fuerza y Control', codigos: ['820704101009203', '82140712-509203'] },
  { nombre: 'Cable de Instrumentación', actividad: 'Cable de Instrumentación', codigos: ['1492A'] },
  { nombre: 'Canalización y Soportería', actividad: 'Canalización y Soportería', codigos: ["TB-1''", "TB-FLEX-1''", 'CONDULET-LL', 'CONDULET-LR', 'CONDULET-T', 'CONECTOR'] },
  { nombre: 'Comunicación', actividad: 'Comunicación', codigos: ['PFL6X04WH-CEG', 'CJS6X88TGY', 'CADIN1IG', 'SPS6X88-C'] },
  { nombre: 'Tablero de Botonera', actividad: 'Tablero de Botonera', codigos: ['TABLERO'] },
  { nombre: 'Equipos Eléctricos – Schneider', actividad: 'Equipos Eléctricos – Schneider', codigos: ['C10H3TM016', 'LC1D12F7', 'TA250W', 'XB4BVG3', 'XB4BVG4', 'XB4BVG5', 'XB4BD33'] },
  { nombre: 'Equipos Eléctricos – Allen-Bradley', actividad: 'Equipos Eléctricos – Allen-Bradley', codigos: ['193-ESM-VIG-30A-CT', '193-EIO-43-120', '193-ECM-ETR', '193-EXP-DIO-42-120', '800T-A1D1', '800T-A6D2', '800TC-TFXT6A5S', '800H-3HZ4'] },
  { nombre: 'Instrumentos – Transmisores de Presión', actividad: 'Instrumentos – Transmisores de Presión', codigos: ['US103894521'] },
  { nombre: 'Instrumentos – Válvulas Automáticas', actividad: 'Instrumentos – Válvulas Automáticas', codigos: ['032U8504', '018F7360', 'G1NU2000'] },
  { nombre: 'Alquiler de Andamios', actividad: 'Alquiler de Andamios (1 y 2 cuerpos)', codigos: ['TORRE'], servicio: true },
]
const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : '—')

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ where: { codigo: 'CJM51' }, select: { id: true, codigo: true, nombre: true } })
  if (await prisma.listaEquipo.count({ where: { proyectoId: proyecto.id } })) throw new Error('CJM51 ya tiene listas: revisar antes de crear')
  const responsable = await prisma.user.findFirstOrThrow({ where: { name: { equals: 'JESUS MAMANI', mode: 'insensitive' } }, select: { id: true, name: true } })
  const cotizados = await prisma.proyectoEquipoCotizadoItem.findMany({
    where: { proyectoEquipoCotizado: { proyectoId: proyecto.id } },
    select: { id: true, proyectoEquipoId: true, codigo: true, descripcion: true, marca: true, categoria: true, unidad: true, cantidad: true, precioCliente: true, catalogoEquipoId: true, listaId: true },
  })
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { proyectoId: proyecto.id, tipo: 'planificacion' }, select: { id: true } })

  const plan = []
  const usados = new Set<string>()
  for (const [i, l] of LISTAS.entries()) {
    const items = l.codigos.map(c => {
      const it = cotizados.find(x => x.codigo === c && !usados.has(x.id))
      if (!it) throw new Error(`No está en cotizados: ${c}`)
      if (it.listaId) throw new Error(`Ya está en una lista: ${c}`)
      usados.add(it.id)
      return it
    })
    const act = await prisma.proyectoActividad.findFirst({
      where: { proyectoCronogramaId: cron.id, nombre: l.actividad },
      select: { proyectoTarea: { select: { nombre: true, fechaInicio: true, fechaFin: true } } },
    })
    const fechas = (act?.proyectoTarea ?? [])
      .filter(t => (l.servicio ? /Movilizaci/.test(t.nombre) : /Recepción en Almacén GYS/.test(t.nombre)))
      .map(t => (l.servicio ? t.fechaInicio : t.fechaFin))
    const fechaNecesaria = fechas.length ? new Date(Math.max(...fechas.map(f => f.getTime()))) : null
    const conCatalogo = await Promise.all(items.map(async it => ({
      ...it,
      catalogo: it.catalogoEquipoId ?? (await prisma.catalogoEquipo.findFirst({ where: { codigo: it.codigo }, select: { id: true } }))?.id ?? null,
    })))
    plan.push({ ...l, numero: i + 1, codigo: `${proyecto.codigo}-LST-${String(i + 1).padStart(3, '0')}`, fechaNecesaria, items: conCatalogo })
  }
  const sinAsignar = cotizados.filter(c => !usados.has(c.id))

  console.log(`CJM51 · responsable ${responsable.name} · ${plan.length} listas`)
  for (const p of plan) {
    console.log(`\n${p.codigo} | ${p.nombre} | necesaria ${d(p.fechaNecesaria)}${p.servicio ? ' | servicio' : ''}`)
    for (const it of p.items) console.log(`    ${it.codigo.padEnd(20)} ${String(it.cantidad).padStart(5)} ${it.unidad.padEnd(4)} ${it.catalogo ? '[catálogo]' : '          '} ${it.descripcion.replace(/\s+/g, ' ').slice(0, 60)}`)
  }
  console.log(`\nSin asignar (quedan en cotizados): ${sinAsignar.map(c => `${c.codigo} (${c.descripcion.slice(0, 25)})`).join(', ')}`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  for (const p of plan) {
    const lista = await prisma.$transaction(async tx => {
      const lista = await tx.listaEquipo.create({ data: {
        id: `lista-${randomUUID()}`, proyectoId: proyecto.id, codigo: p.codigo, nombre: p.nombre, numeroSecuencia: p.numero,
        orden: p.numero, estado: 'borrador', responsableId: responsable.id, fechaNecesaria: p.fechaNecesaria, createdAt: ahora, updatedAt: ahora,
      } })
      for (const [k, it] of p.items.entries()) {
        const item = await tx.listaEquipoItem.create({ data: {
          id: `lista-item-${randomUUID()}`, listaId: lista.id, proyectoEquipoId: it.proyectoEquipoId, proyectoEquipoItemId: it.id,
          codigo: it.codigo, descripcion: it.descripcion, marca: it.marca || 'SIN-MARCA', categoria: it.categoria || 'SIN-CATEGORIA',
          unidad: it.unidad || 'und', cantidad: it.cantidad, cantidadPedida: 0, presupuesto: it.precioCliente || 0, orden: k,
          catalogoEquipoId: it.catalogo, tipoItem: p.servicio ? 'servicio' : 'equipo', estado: 'borrador', origen: 'cotizado',
          responsableId: responsable.id, createdAt: ahora, updatedAt: ahora,
        } })
        await tx.proyectoEquipoCotizadoItem.update({ where: { id: it.id }, data: { estado: 'en_lista', listaId: lista.id, listaEquipoSeleccionadoId: item.id, updatedAt: ahora } })
      }
      return lista
    })
    await crearEvento(prisma, {
      listaEquipoId: lista.id, proyectoId: proyecto.id, tipo: 'lista_creada',
      descripcion: `Lista ${lista.codigo} creada: ${lista.nombre} (${p.items.length} ítems de cotizados)`,
      usuarioId: responsable.id, metadata: { codigo: lista.codigo, origen: 'script-procura-cjm51', totalItems: p.items.length },
    }).catch(() => {})
  }
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
