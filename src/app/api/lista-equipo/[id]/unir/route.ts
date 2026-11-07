// /api/lista-equipo/[id]/unir — unir una parte (CJM50-LST-004B) a su lista
// original, para deshacer una separación hecha por error. Reglas en
// lib/services/dividirListaEquipo (evaluarUnion / unirParte).
//
// GET  → { esParte, puede, motivos: string[] (bloquean), avisos: string[] (no bloquean), raiz, parteCodigo, totalItems }
// POST → { raiz: { id, codigo }, movidos }

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { flujoEstados, type EstadoListaEquipo } from '@/lib/utils/flujoListaEquipo'
import { ErrorDivision, evaluarUnion, unirParte } from '@/lib/services/dividirListaEquipo'

/** Puede unir quien puede mover tanto la parte como la original en sus estados. */
function motivoPermiso(estados: string[], session: { user: { roles?: string[]; role?: string } }): string | null {
  const roles = session.user.roles?.length ? session.user.roles : [session.user.role || '']
  const ok = estados.every((e) => (flujoEstados[e as EstadoListaEquipo]?.roles ?? []).some((r) => roles.includes(r)))
  return ok ? null : 'Solo pueden unir los roles que pueden mover la lista en su estado.'
}

async function evaluar(id: string, session: any) {
  const ev = await evaluarUnion(id)
  if (!ev) return null
  const motivos = [...ev.motivos]
  if (ev.raiz) {
    const permiso = motivoPermiso([ev.parte.estado, ev.raiz.estado], session)
    if (permiso) motivos.push(permiso)
  }
  return { ev, motivos }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const r = await evaluar(id, session)
  if (!r) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
  return NextResponse.json({
    esParte: !!r.ev.raiz,
    puede: r.motivos.length === 0,
    motivos: r.motivos,
    avisos: r.ev.avisos,
    raiz: r.ev.raiz ? { id: r.ev.raiz.id, codigo: r.ev.raiz.codigo, nombre: r.ev.raiz.nombre } : null,
    parteCodigo: r.ev.parte.codigo,
    totalItems: r.ev.totalItems,
  })
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await context.params
    const r = await evaluar(id, session)
    if (!r) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
    if (r.motivos.length) return NextResponse.json({ error: `No se puede unir: ${r.motivos.join(' ')}`, motivos: r.motivos }, { status: 400 })
    const res = await unirParte({ parteId: id, usuarioId: session.user.id })
    return NextResponse.json({ raiz: { id: res.raiz.id, codigo: res.raiz.codigo }, movidos: res.movidos })
  } catch (error) {
    if (error instanceof ErrorDivision) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error al unir lista:', error)
    return NextResponse.json({ error: 'Error al unir la lista: ' + String(error) }, { status: 500 })
  }
}
