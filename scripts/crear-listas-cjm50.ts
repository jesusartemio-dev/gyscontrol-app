/**
 * CJM50 — listas de equipos por familia de PROCURA (como CJM51), con los ítems cotizados.
 *  - Responsable: Jesús Mamani. Estado: borrador. ID: UUID (la página de detalle no acepta otro formato).
 *  - Fecha necesaria: "Recepción en Almacén GYS" de cada familia en la Línea Base
 *    (alquileres: Movilización a Obra), aunque ya esté vencida.
 *  - LST-001 (ya tiene cotización y pedido) solo se renombra a "Cable de Fuerza".
 *  - Cambios pedidos por el gestor (27/10):
 *      ÖLFLEX 2×1,5: 50 m (cotizado como "1 und").
 *      HDPE de fuerza: 2" → 3" (reemplazo del cotizado).
 *      Insumos varios: lista aparte.
 *      Andamio voladizo → andamio multicuerpo de 10 cuerpos con armado (servicio, reemplazo)
 *      + 2 andamios de 1 cuerpo (alquiler) + manlift (alquiler).
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/crear-listas-cjm50.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { crearEvento } from '../src/lib/utils/trazabilidad'

const APLICAR = process.argv.includes('--aplicar')

interface Nuevo { codigo: string; descripcion: string; marca: string; categoria: string; unidad: string; cantidad: number; comentario: string; reemplazaA?: string }
interface PlanLista {
  nombre: string
  actividad: string // actividad del cronograma de la que sale la fecha necesaria
  hito: RegExp
  codigos: string[] // ítems cotizados tal cual
  ajustes?: Record<string, { cantidad?: number; unidad?: string; comentario: string }>
  nuevos?: Nuevo[]
  servicio?: boolean
}

const LISTAS: PlanLista[] = [
  {
    nombre: 'Cable de Control', actividad: 'Cable de Control', hito: /Recepción en Almacén GYS/,
    codigos: ['ÖLFLEX® FD 855 CP 2X1,5'],
    ajustes: { 'ÖLFLEX® FD 855 CP 2X1,5': { cantidad: 50, unidad: 'm', comentario: '50 m (en la cotización figura como "1 und").' } },
  },
  {
    nombre: 'Tuberías HDPE', actividad: 'Tuberías HDPE', hito: /Recepción en Almacén GYS/,
    codigos: ['HDPE-INSTRUMENTACION'],
    nuevos: [{
      codigo: 'POR DEFINIR', descripcion: 'PARA PROTECCIÓN DE CABLE DE FUERZA: TUBERIA HDPE 3"', marca: 'Sin marca', categoria: 'TUBERÍAS',
      unidad: 'rollo', cantidad: 1, reemplazaA: 'ROLLO63NEGRO',
      comentario: 'HDPE de 3" para la protección del cable de fuerza; reemplaza a la de 2" (63 mm SDR17) cotizada. Confirmar código y cantidad con el proveedor.',
    }],
  },
  {
    nombre: 'Bandejas y Soportería', actividad: 'Bandejas y Soporteria', hito: /Recepción en Almacén GYS/,
    codigos: ['BV150X100X3000', 'BV150X3000', 'CH150X100', 'CHT150X100', 'CV150X100', 'CVT150X100', 'BV300X100X3000', 'BV300X3000', 'CH300X100', 'CHT300X100', 'CV300X100', 'CVT300X100', 'BV600X100X3000', 'CH600X100'],
  },
  {
    nombre: 'Tablero Intermedio', actividad: 'Tablero Intermedio', hito: /Recepción en Almacén GYS/,
    codigos: ['TAB-MTTO', 'BD'],
  },
  {
    nombre: 'Soporte de Tablero Intermedio', actividad: 'Soporte de Tablero Intermedio', hito: /Recepción en Almacén GYS/,
    codigos: ['TAB'],
  },
  {
    nombre: 'Accesorios e Insumos Varios', actividad: 'Bandejas y Soporteria', hito: /Recepción en Almacén GYS/,
    codigos: ['MV'],
  },
  {
    nombre: 'Alquiler de Andamios y Manlift', actividad: 'Andamios (1 Cuerpo)', hito: /Movilizaci/, servicio: true,
    codigos: [],
    nuevos: [
      {
        codigo: 'POR DEFINIR', descripcion: 'ALQUILER Y ARMADO DE ANDAMIO MULTICUERPO DE 10 CUERPOS', marca: 'Sin marca', categoria: 'ALQUILER',
        unidad: 'und', cantidad: 1, reemplazaA: 'AND',
        comentario: 'Servicio de alquiler + armado (antes "andamios tipo voladizo" en la cotización). El cronograma enviado dice 8 cuerpos.',
      },
      { codigo: 'POR DEFINIR', descripcion: 'ALQUILER DE ANDAMIO DE 1 CUERPO', marca: 'Sin marca', categoria: 'ALQUILER', unidad: 'und', cantidad: 2, comentario: 'Alquiler (GYS los arma).' },
      { codigo: 'POR DEFINIR', descripcion: 'ALQUILER DE MANLIFT', marca: 'Sin marca', categoria: 'ALQUILER', unidad: 'und', cantidad: 1, comentario: 'Alquiler. Definir altura de trabajo y días.' },
    ],
  },
]
// Las restauraciones y tapas faltantes se agregan en la lista de bandejas si aparecen en cotizados.
const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : '—')

async function main() {
  const proyecto = await prisma.proyecto.findFirstOrThrow({ where: { codigo: 'CJM50' }, select: { id: true, codigo: true } })
  const responsable = await prisma.user.findFirstOrThrow({ where: { name: { equals: 'JESUS MAMANI', mode: 'insensitive' } }, select: { id: true, name: true } })
  const lst001 = await prisma.listaEquipo.findUniqueOrThrow({ where: { codigo: 'CJM50-LST-001' }, select: { id: true, nombre: true } })
  const ultima = await prisma.listaEquipo.findFirst({ where: { proyectoId: proyecto.id }, orderBy: { numeroSecuencia: 'desc' }, select: { numeroSecuencia: true } })
  const cotizados = await prisma.proyectoEquipoCotizadoItem.findMany({
    where: { proyectoEquipoCotizado: { proyectoId: proyecto.id } },
    select: { id: true, proyectoEquipoId: true, codigo: true, descripcion: true, marca: true, categoria: true, unidad: true, cantidad: true, precioCliente: true, catalogoEquipoId: true, listaId: true },
  })
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { proyectoId: proyecto.id, tipo: 'planificacion' }, select: { id: true } })
  const cot = (c: string) => {
    const x = cotizados.find(i => i.codigo === c)
    if (!x) throw new Error(`No está en cotizados: ${c}`)
    if (x.listaId) throw new Error(`Ya está en una lista: ${c}`)
    return x
  }
  // Los cotizados que no se ubican quedan pendientes (para verlos en la vista previa).
  const usados = new Set<string>()

  let numero = ultima?.numeroSecuencia ?? 0
  const plan = []
  for (const l of LISTAS) {
    numero++
    const tareas = await prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: cron.id, proyectoActividad: { nombre: l.actividad } }, select: { nombre: true, fechaInicio: true, fechaFin: true } })
    const fechas = tareas.filter(t => l.hito.test(t.nombre)).map(t => (l.servicio ? t.fechaInicio : t.fechaFin))
    const items = l.codigos.map(c => { const x = cot(c); usados.add(x.id); return x })
    for (const n of l.nuevos ?? []) if (n.reemplazaA) usados.add(cot(n.reemplazaA).id)
    plan.push({ ...l, numero, codigo: `${proyecto.codigo}-LST-${String(numero).padStart(3, '0')}`, fechaNecesaria: fechas.length ? new Date(Math.max(...fechas.map(f => f.getTime()))) : null, items })
  }
  const pendientes = cotizados.filter(c => !usados.has(c.id) && !c.listaId)

  console.log(`CJM50 · responsable ${responsable.name}`)
  console.log(`~ CJM50-LST-001: "${lst001.nombre}" → "Cable de Fuerza" (tiene cotización y pedido: solo se renombra)`)
  for (const p of plan) {
    console.log(`\n${p.codigo} | ${p.nombre} | necesaria ${d(p.fechaNecesaria)}${p.servicio ? ' | servicio' : ''}`)
    for (const it of p.items) {
      const aj = p.ajustes?.[it.codigo]
      console.log(`    ${it.codigo.padEnd(24)} ${String(aj?.cantidad ?? it.cantidad).padStart(4)} ${(aj?.unidad ?? it.unidad).padEnd(6)} ${it.descripcion.replace(/\s+/g, ' ').slice(0, 55)}${aj ? `  (${aj.comentario})` : ''}`)
    }
    for (const n of p.nuevos ?? []) console.log(`  + ${n.codigo.padEnd(24)} ${String(n.cantidad).padStart(4)} ${n.unidad.padEnd(6)} ${n.descripcion.slice(0, 55)}${n.reemplazaA ? `  ⇄ reemplaza ${n.reemplazaA}` : '  (nuevo)'}`)
  }
  console.log(`\nCotizados que quedan sin lista: ${pendientes.map(c => c.codigo).join(', ') || 'ninguno'}`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-listas-CJM50-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ lst001 }, null, 2))
  await prisma.listaEquipo.update({ where: { id: lst001.id }, data: { nombre: 'Cable de Fuerza' } })
  for (const p of plan) {
    const lista = await prisma.$transaction(async tx => {
      const lista = await tx.listaEquipo.create({ data: {
        id: randomUUID(), proyectoId: proyecto.id, codigo: p.codigo, nombre: p.nombre, numeroSecuencia: p.numero, orden: p.numero,
        estado: 'borrador', responsableId: responsable.id, fechaNecesaria: p.fechaNecesaria, createdAt: ahora, updatedAt: ahora,
      } })
      let orden = 0
      for (const it of p.items) {
        const aj = p.ajustes?.[it.codigo]
        const item = await tx.listaEquipoItem.create({ data: {
          id: `lista-item-${randomUUID()}`, listaId: lista.id, proyectoEquipoId: it.proyectoEquipoId, proyectoEquipoItemId: it.id,
          codigo: it.codigo, descripcion: it.descripcion, marca: it.marca || 'SIN-MARCA', categoria: it.categoria || 'SIN-CATEGORIA',
          unidad: aj?.unidad ?? it.unidad ?? 'und', cantidad: aj?.cantidad ?? it.cantidad, cantidadPedida: 0, presupuesto: it.precioCliente || 0,
          orden: orden++, catalogoEquipoId: it.catalogoEquipoId ?? null, tipoItem: p.servicio ? 'servicio' : 'equipo', estado: 'borrador', origen: 'cotizado',
          comentarioRevision: aj?.comentario ?? null, responsableId: responsable.id, createdAt: ahora, updatedAt: ahora,
        } })
        await tx.proyectoEquipoCotizadoItem.update({ where: { id: it.id }, data: { estado: 'en_lista', listaId: lista.id, listaEquipoSeleccionadoId: item.id, updatedAt: ahora } })
      }
      for (const n of p.nuevos ?? []) {
        const original = n.reemplazaA ? cot(n.reemplazaA) : null
        const item = await tx.listaEquipoItem.create({ data: {
          id: `lista-item-${randomUUID()}`, listaId: lista.id, proyectoEquipoId: original?.proyectoEquipoId ?? null,
          proyectoEquipoItemId: original?.id ?? null, reemplazaProyectoEquipoCotizadoItemId: original?.id ?? null,
          codigo: n.codigo, descripcion: n.descripcion, marca: n.marca, categoria: n.categoria, unidad: n.unidad, cantidad: n.cantidad,
          cantidadPedida: 0, presupuesto: 0, orden: orden++, tipoItem: p.servicio ? 'servicio' : 'equipo', estado: 'borrador',
          origen: original ? 'reemplazo' : 'nuevo', comentarioRevision: n.comentario, responsableId: responsable.id, createdAt: ahora, updatedAt: ahora,
        } })
        if (original) {
          await tx.proyectoEquipoCotizadoItem.update({ where: { id: original.id }, data: {
            estado: 'reemplazado', listaId: lista.id, listaEquipoSeleccionadoId: item.id, motivoCambio: n.comentario, updatedAt: ahora,
          } })
        }
      }
      return lista
    })
    await crearEvento(prisma, {
      listaEquipoId: lista.id, proyectoId: proyecto.id, tipo: 'lista_creada',
      descripcion: `Lista ${lista.codigo} creada: ${lista.nombre}`, usuarioId: responsable.id,
      metadata: { codigo: lista.codigo, origen: 'script-procura-cjm50' },
    }).catch(() => {})
  }
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
