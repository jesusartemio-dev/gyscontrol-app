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

// ---------------------------------------------------------------------------
// Unir una parte a su lista original (deshacer una separación).
//
// Solo si es un error simple: la parte sigue en Borrador, ningún ítem tiene
// cotizaciones, pedidos ni OC, y la original acepta ítems (Borrador o Por
// Revisar). Los ítems vuelven al final de la original (mismo orden), su ítem
// cotizado y su desglose vuelven a la original, el historial de la parte pasa a
// la original y la parte se elimina (su letra queda libre).
// ---------------------------------------------------------------------------

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: 'Borrador', por_revisar: 'Por Revisar', por_cotizar: 'Por Cotizar',
  por_aprobar: 'Por Aprobar', aprobada: 'Aprobada', anulada: 'Anulada',
}

export async function evaluarUnion(parteId: string) {
  const parte = await prisma.listaEquipo.findUnique({
    where: { id: parteId },
    include: {
      listaOrigen: { select: { id: true, codigo: true, nombre: true, estado: true, proyectoId: true } },
      listaEquipoItem: {
        orderBy: { orden: 'asc' },
        include: {
          _count: { select: { cotizacionProveedorItems: true, ordenCompraItems: true } },
          pedidoEquipoItem: { select: { pedidoEquipo: { select: { codigo: true } } } },
        },
      },
    },
  })
  if (!parte) return null
  const raiz = parte.listaOrigen
  const motivos: string[] = []
  if (!raiz) {
    motivos.push('Esta lista no es una parte de otra lista.')
  } else {
    if (parte.estado !== 'borrador') {
      motivos.push(`${parte.codigo} está en ${ETIQUETA_ESTADO[parte.estado] ?? parte.estado}; solo se une desde Borrador.`)
    }
    if (raiz.estado === 'anulada') {
      motivos.push(`${raiz.codigo} está anulada.`)
    } else if (!ESTADOS_DIVISIBLES.includes(raiz.estado)) {
      motivos.push(`${raiz.codigo} ya está en ${ETIQUETA_ESTADO[raiz.estado] ?? raiz.estado} y no acepta ítems. Retrocédela a Por Revisar o deja la parte separada.`)
    }
  }
  for (const i of parte.listaEquipoItem) {
    const pedidos = [...new Set(i.pedidoEquipoItem.map((p) => p.pedidoEquipo?.codigo).filter(Boolean))]
    if (pedidos.length || (i.cantidadPedida ?? 0) > 0) motivos.push(`${i.codigo} tiene pedido${pedidos.length ? ` (${pedidos.join(', ')})` : ''}.`)
    if (i._count.ordenCompraItems > 0) motivos.push(`${i.codigo} tiene orden de compra.`)
    if (i._count.cotizacionProveedorItems > 0 || i.cotizacionSeleccionadaId) motivos.push(`${i.codigo} tiene cotizaciones de proveedor.`)
  }

  // Avisos (no bloquean): qué cambió desde que se separó, para confirmar sabiendo.
  const avisos: string[] = []
  if (raiz) {
    // Ítems separados: los que registró el evento de creación de la parte.
    const creacion = await prisma.eventoTrazabilidad.findFirst({
      where: { listaEquipoId: parte.id, tipo: 'lista_creada' },
      orderBy: { fechaEvento: 'asc' },
      select: { metadata: true },
    })
    const separados = (creacion?.metadata as { items?: { id: string }[] } | null)?.items
    if (separados) {
      const ids = new Set(separados.map((x) => x.id))
      const nuevos = parte.listaEquipoItem.filter((i) => !ids.has(i.id))
      if (nuevos.length) {
        avisos.push(`${nuevos.length} ítem(s) se agregaron a ${parte.codigo} después de separar: ${nuevos.map((i) => i.codigo).join(', ')}. También pasan a ${raiz.codigo}.`)
      }
    }
    // Mismo código en las dos listas: al unir quedarían dos líneas.
    const enRaiz = await prisma.listaEquipoItem.findMany({ where: { listaId: raiz.id }, select: { codigo: true } })
    const codigosRaiz = new Set(enRaiz.map((i) => i.codigo.trim().toUpperCase()).filter((c) => c && c !== 'POR DEFINIR'))
    const repetidos = [...new Set(parte.listaEquipoItem.map((i) => i.codigo).filter((c) => codigosRaiz.has(c.trim().toUpperCase())))]
    if (repetidos.length) {
      avisos.push(`Posible duplicado: ${repetidos.join(', ')} ya está en ${raiz.codigo}; quedarían dos líneas.`)
    }
    if (raiz.estado === 'por_revisar' && parte.listaEquipoItem.length) {
      avisos.push(`${raiz.codigo} está en Por Revisar: los ítems llegan sin verificar y hay que verificarlos.`)
    }
  }
  return { parte, raiz, motivos, avisos, puede: motivos.length === 0, totalItems: parte.listaEquipoItem.length }
}

export async function unirParte(o: { parteId: string; usuarioId: string }) {
  const ev = await evaluarUnion(o.parteId)
  if (!ev) throw new ErrorDivision('Lista no encontrada', 404)
  if (!ev.puede || !ev.raiz) throw new ErrorDivision(`No se puede unir: ${ev.motivos.join(' ')}`)
  const { parte, raiz } = ev
  const itemIds = parte.listaEquipoItem.map((i) => i.id)
  const desgloses = [...new Set(parte.listaEquipoItem.map((i) => i.desgloseDeProyectoEquipoCotizadoItemId).filter((x): x is string => !!x))]

  await prisma.$transaction(async (tx) => {
    const ultimo = await tx.listaEquipoItem.aggregate({ where: { listaId: raiz.id }, _max: { orden: true } })
    let orden = (ultimo._max.orden ?? -1) + 1
    for (const id of itemIds) {
      await tx.listaEquipoItem.update({ where: { id }, data: { listaId: raiz.id, orden: orden++ } })
    }
    // Ítems cotizados que apuntaban a la parte vuelven a la original.
    await tx.proyectoEquipoCotizadoItem.updateMany({ where: { listaId: parte.id }, data: { listaId: raiz.id } })
    // Desglose: queda registrado en la original (el de la parte se va con ella).
    for (const cotizadoId of desgloses) {
      await tx.desgloseEquipoItem.upsert({
        where: { proyectoEquipoCotizadoItemId_listaEquipoId: { proyectoEquipoCotizadoItemId: cotizadoId, listaEquipoId: raiz.id } },
        create: { proyectoEquipoCotizadoItemId: cotizadoId, listaEquipoId: raiz.id },
        update: {},
      })
    }
    // El historial de la parte no se pierde: pasa a la original.
    await tx.eventoTrazabilidad.updateMany({ where: { listaEquipoId: parte.id }, data: { listaEquipoId: raiz.id } })
    await tx.listaEquipo.delete({ where: { id: parte.id } })
    // Cierra el hueco en el orden de las listas del proyecto.
    await tx.listaEquipo.updateMany({
      where: { proyectoId: parte.proyectoId, orden: { gt: parte.orden } },
      data: { orden: { decrement: 1 } },
    })
  })

  const codigos = parte.listaEquipoItem.map((i) => i.codigo).join(', ')
  await crearEvento(prisma, {
    listaEquipoId: raiz.id, proyectoId: parte.proyectoId, tipo: 'lista_unida', usuarioId: o.usuarioId,
    descripcion: `Se unieron ${itemIds.length} ítem(s) de ${parte.codigo} (${parte.nombre}), que se eliminó: ${codigos}`,
    metadata: { listaParte: parte.codigo, items: parte.listaEquipoItem.map((i) => ({ id: i.id, codigo: i.codigo })) },
  })
  return { raiz, movidos: itemIds.length, parteCodigo: parte.codigo }
}
