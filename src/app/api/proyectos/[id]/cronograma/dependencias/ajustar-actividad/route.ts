// POST /api/proyectos/[id]/cronograma/dependencias/ajustar-actividad
//   { actividadId } | { edtId } | { faseId } | { cronogramaId }   [+ simular: true]
// "Ajustar tareas a sus predecesoras" de una actividad, un EDT, una fase o todo
// el cronograma (ver src/lib/services/cronogramaAjuste.ts): compacta cada tarea
// con predecesoras a donde la exigen todas, en cascada, con sus desfases. Las
// tareas sin predecesoras y las 📌 fijas no se mueven. Con `simular` solo
// devuelve el resumen (cuántas se mueven, nuevo fin) para confirmar antes.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { aplicarAjuste, calcularAjuste, paraDeshacer, type AlcanceAjuste } from '@/lib/services/cronogramaAjuste'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as {
      actividadId?: string; edtId?: string; faseId?: string; cronogramaId?: string; simular?: boolean
    }
    const alcance: AlcanceAjuste | null =
      body.actividadId ? { tipo: 'actividad', id: body.actividadId }
      : body.edtId ? { tipo: 'edt', id: body.edtId }
      : body.faseId ? { tipo: 'fase', id: body.faseId }
      : body.cronogramaId ? { tipo: 'cronograma', id: body.cronogramaId }
      : null
    if (!alcance) return NextResponse.json({ error: 'Falta actividadId, edtId, faseId o cronogramaId' }, { status: 400 })
    const nombreAlcance = { actividad: 'la actividad', edt: 'el EDT', fase: 'la fase', cronograma: 'el cronograma', sucesoras: '' }[alcance.tipo]

    const r = await calcularAjuste(proyectoId, alcance)
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 })
    if (!r.totalTareas) return NextResponse.json({ error: `${nombreAlcance} no tiene tareas` }, { status: 400 })
    if (!r.cronogramaId) return NextResponse.json({ error: 'No se encontró el cronograma' }, { status: 404 })

    const permiso = await validarPermisoCronograma(r.cronogramaId)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(r.cronogramaId)) return cronogramaBloqueadoResponse()

    const resumen = {
      tareasAjustadas: r.cambios.length,
      totalTareas: r.totalTareas,
      finAntes: r.finAntes,
      finDespues: r.finDespues,
      maxAtrasoHoras: r.maxAtrasoHoras,
      maxAdelantoHoras: r.maxAdelantoHoras,
      fijasIncumplidas: r.fijasIncumplidas,
      // Las primeras, para mostrar en la confirmación.
      ejemplos: r.cambios.slice(0, 8).map(c => ({ nombre: c.nombre, antes: c.antes.inicio, despues: c.despues.inicio })),
    }
    if (body.simular) return NextResponse.json({ success: true, data: resumen })

    await aplicarAjuste(r)
    // Compatibilidad con el aviso de antes ("N de M tareas").
    return NextResponse.json({ success: true, data: { ...resumen, deshacer: paraDeshacer(r) } })
  } catch (error) {
    logger.error('❌ Error ajustando tareas a sus predecesoras:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
