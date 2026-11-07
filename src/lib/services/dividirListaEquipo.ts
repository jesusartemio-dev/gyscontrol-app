// Separar ítems de una lista de equipos en una lista nueva (una "parte"):
// p. ej. en CJM50-LST-004 los ítems ya validados siguen y avanzan a cotizar, y
// los pendientes pasan a CJM50-LST-004B en Borrador.
//
//  - Código: el de la ORIGINAL + letra (004B, 004C…). Separar una parte también
//    cuelga de la original (004C, no 004BB). La original no se renombra (su
//    código ya está en pedidos, cotizaciones y documentos). Las partes conservan
//    su numeroSecuencia, así la siguiente lista nueva del proyecto sigue en 010.
//  - Nombre: "<nombre de la original> (B)" por defecto; editable.
//  - Solo desde Borrador o Por Revisar (los permisos por rol los valida la API).
//  - Solo se mueven ítems sin cotizaciones, pedidos ni OC: esos registros guardan
//    la lista de la que salieron. El `origen` del ítem (cotizado/nuevo/reemplazo)
//    no cambia. Se actualiza la lista del ítem cotizado elegido y del desglose.

import { prisma } from '@/lib/prisma'
import { crearEvento } from '@/lib/utils/trazabilidad'

export const ESTADOS_DIVISIBLES = ['borrador', 'por_revisar']
const LETRAS = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'

export class ErrorDivision extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export async function cargarDivision(listaId: string) {
  const lista = await prisma.listaEquipo.findUnique({
    where: { id: listaId },
    include: {
      listaEquipoItem: {
        orderBy: { orden: 'asc' },
        include: { _count: { select: { cotizacionProveedorItems: true, pedidoEquipoItem: true, ordenCompraItems: true } } },
      },
    },
  })
  if (!lista) return null
  const raiz = lista.listaOrigenId
    ? await prisma.listaEquipo.findUnique({ where: { id: lista.listaOrigenId } })
    : lista
  if (!raiz) return null
  const partes = await prisma.listaEquipo.findMany({
    where: { listaOrigenId: raiz.id },
    orderBy: { codigo: 'asc' },
    select: { id: true, codigo: true, nombre: true, estado: true, orden: true },
  })
  return { lista, raiz, partes }
}

/** Siguiente letra libre para la original: B, C, D… (salta códigos ya usados). */
export async function siguienteCodigoParte(raizCodigo: string, partes: { codigo: string }[]) {
  const usadas = new Set(partes.map((p) => p.codigo.slice(raizCodigo.length)).filter((s) => /^[A-Z]$/.test(s)))
  for (const letra of LETRAS) {
    if (usadas.has(letra)) continue
    const codigo = `${raizCodigo}${letra}`
    if (!(await prisma.listaEquipo.findUnique({ where: { codigo }, select: { id: true } }))) return { codigo, letra }
  }
  return null
}

/** Por qué un ítem no se puede mover (null = se puede). */
export function bloqueoItem(i: {
  cotizacionSeleccionadaId: string | null
  cantidadPedida: number | null
  _count: { cotizacionProveedorItems: number; pedidoEquipoItem: number; ordenCompraItems: number }
}): string | null {
  if (i._count.pedidoEquipoItem > 0 || (i.cantidadPedida ?? 0) > 0) return 'Tiene pedidos'
  if (i._count.ordenCompraItems > 0) return 'Tiene orden de compra'
  if (i._count.cotizacionProveedorItems > 0 || i.cotizacionSeleccionadaId) return 'Tiene cotizaciones'
  return null
}

export async function dividirLista(o: { listaId: string; itemIds: string[]; nombre?: string; usuarioId: string }) {
  const itemIds = [...new Set(o.itemIds)]
  if (!itemIds.length) throw new ErrorDivision('Elige al menos un ítem para separar')
  const datos = await cargarDivision(o.listaId)
  if (!datos) throw new ErrorDivision('Lista no encontrada', 404)
  const { lista, raiz, partes } = datos
  if (!ESTADOS_DIVISIBLES.includes(lista.estado)) {
    throw new ErrorDivision('Solo se pueden separar ítems de una lista en Borrador o Por Revisar')
  }

  const mover = lista.listaEquipoItem.filter((i) => itemIds.includes(i.id))
  if (mover.length !== itemIds.length) throw new ErrorDivision('Algún ítem no pertenece a esta lista')
  if (mover.length === lista.listaEquipoItem.length) throw new ErrorDivision('Deja al menos un ítem en la lista original')
  const bloqueados = mover.map((i) => ({ i, motivo: bloqueoItem(i) })).filter((x) => x.motivo)
  if (bloqueados.length) {
    throw new ErrorDivision(`No se pueden mover: ${bloqueados.map((x) => `${x.i.codigo} (${x.motivo})`).join(', ')}`)
  }

  const sig = await siguienteCodigoParte(raiz.codigo, partes)
  if (!sig) throw new ErrorDivision('No quedan letras libres para esta lista')
  const nombre = o.nombre?.trim() || `${raiz.nombre} (${sig.letra})`
  const movidosIds = mover.map((i) => i.id)
  const desgloses = [...new Set(mover.map((i) => i.desgloseDeProyectoEquipoCotizadoItemId).filter((x): x is string => !!x))]

  const nueva = await prisma.$transaction(async (tx) => {
    // La parte va justo después de la original y sus partes anteriores.
    const ordenNueva = Math.max(raiz.orden, ...partes.map((p) => p.orden)) + 1
    await tx.listaEquipo.updateMany({
      where: { proyectoId: lista.proyectoId, orden: { gte: ordenNueva } },
      data: { orden: { increment: 1 } },
    })
    const creada = await tx.listaEquipo.create({
      data: {
        id: crypto.randomUUID(),
        proyectoId: lista.proyectoId,
        responsableId: lista.responsableId,
        codigo: sig.codigo,
        numeroSecuencia: raiz.numeroSecuencia,
        nombre,
        orden: ordenNueva,
        estado: 'borrador',
        fechaNecesaria: lista.fechaNecesaria,
        listaOrigenId: raiz.id,
      },
    })
    for (const [orden, itemId] of movidosIds.entries()) {
      await tx.listaEquipoItem.update({ where: { id: itemId }, data: { listaId: creada.id, orden } })
    }
    // El ítem cotizado elegido en esta lista pasa a apuntar a la parte.
    await tx.proyectoEquipoCotizadoItem.updateMany({
      where: { listaEquipoSeleccionadoId: { in: movidosIds }, listaId: lista.id },
      data: { listaId: creada.id },
    })
    // Desglose: la parte queda registrada; la original solo si aún le quedan ítems de ese desglose.
    for (const cotizadoId of desgloses) {
      await tx.desgloseEquipoItem.upsert({
        where: { proyectoEquipoCotizadoItemId_listaEquipoId: { proyectoEquipoCotizadoItemId: cotizadoId, listaEquipoId: creada.id } },
        create: { proyectoEquipoCotizadoItemId: cotizadoId, listaEquipoId: creada.id },
        update: {},
      })
      const quedan = await tx.listaEquipoItem.count({ where: { listaId: lista.id, desgloseDeProyectoEquipoCotizadoItemId: cotizadoId } })
      if (!quedan) {
        await tx.desgloseEquipoItem.deleteMany({ where: { proyectoEquipoCotizadoItemId: cotizadoId, listaEquipoId: lista.id } })
      }
    }
    return creada
  })

  // Trazabilidad en las dos listas (qué se movió, de dónde a dónde y quién).
  const codigos = mover.map((i) => i.codigo).join(', ')
  const metadata = { listaOrigen: lista.codigo, listaNueva: nueva.codigo, items: mover.map((i) => ({ id: i.id, codigo: i.codigo })) }
  await Promise.all([
    crearEvento(prisma, {
      listaEquipoId: lista.id, proyectoId: lista.proyectoId, tipo: 'lista_dividida', usuarioId: o.usuarioId, metadata,
      descripcion: `${mover.length} ítem(s) separados a ${nueva.codigo} (${nueva.nombre}): ${codigos}`,
    }),
    crearEvento(prisma, {
      listaEquipoId: nueva.id, proyectoId: lista.proyectoId, tipo: 'lista_creada', usuarioId: o.usuarioId, metadata,
      descripcion: `Lista ${nueva.codigo} creada al separar ${mover.length} ítem(s) de ${lista.codigo}: ${codigos}`,
    }),
  ])
  return nueva
}
