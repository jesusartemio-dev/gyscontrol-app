// /api/lista-equipo/[id]/dividir — separar ítems de una lista en una parte
// (CJM50-LST-004 → 004B). Lógica y reglas en lib/services/dividirListaEquipo.
//
// GET  → { origen, partes, puedeDividir, siguienteCodigo, nombreSugerido, items: [{ id, bloqueo }] }
// POST { itemIds: string[], nombre?: string } → la lista nueva

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { flujoEstados, type EstadoListaEquipo } from '@/lib/utils/flujoListaEquipo'
import {
  ESTADOS_DIVISIBLES, ErrorDivision, bloqueoItem, cargarDivision, dividirLista, siguienteCodigoParte,
} from '@/lib/services/dividirListaEquipo'

/** Puede separar quien puede mover la lista en su estado (Borrador / Por Revisar). */
function puedeSeparar(estado: string, session: { user: { roles?: string[]; role?: string } }) {
  const roles = session.user.roles?.length ? session.user.roles : [session.user.role || '']
  return ESTADOS_DIVISIBLES.includes(estado)
    && (flujoEstados[estado as EstadoListaEquipo]?.roles ?? []).some((r) => roles.includes(r))
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const datos = await cargarDivision(id)
  if (!datos) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
  const { lista, raiz, partes } = datos
  const sig = await siguienteCodigoParte(raiz.codigo, partes)
  return NextResponse.json({
    origen: lista.listaOrigenId ? { id: raiz.id, codigo: raiz.codigo, nombre: raiz.nombre } : null,
    partes: partes.filter((p) => p.id !== lista.id),
    puedeDividir: puedeSeparar(lista.estado, session as any),
    siguienteCodigo: sig?.codigo ?? null,
    nombreSugerido: sig ? `${raiz.nombre} (${sig.letra})` : null,
    items: lista.listaEquipoItem.map((i) => ({ id: i.id, bloqueo: bloqueoItem(i) })),
  })
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as { itemIds?: string[]; nombre?: string }

    const datos = await cargarDivision(id)
    if (!datos) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
    if (!puedeSeparar(datos.lista.estado, session as any)) {
      return NextResponse.json({ error: 'No tienes permiso para separar esta lista en su estado actual' }, { status: 403 })
    }

    const nueva = await dividirLista({ listaId: id, itemIds: body.itemIds ?? [], nombre: body.nombre, usuarioId: session.user.id })
    return NextResponse.json(nueva)
  } catch (error) {
    if (error instanceof ErrorDivision) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error al separar lista:', error)
    return NextResponse.json({ error: 'Error al separar la lista: ' + String(error) }, { status: 500 })
  }
}
