// POST /api/proyectos/[id]/cronograma/dependencias/encadenar-actividad  { actividadId }
// "Encadenar tareas (una tras otra)": crea Fin-Comienzo (sin desfase) entre cada
// tarea de la actividad y la siguiente, en el orden del árbol. No toca lo que ya
// existe: si dos tareas seguidas ya están vinculadas (en cualquier sentido, con
// cualquier tipo o desfase) se dejan como están, y se salta un vínculo que
// cerraría un ciclo. No mueve fechas (modo manual): para eso está "Ajustar
// tareas a sus predecesoras".

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronogramaPorTarea } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { creaCiclo } from '@/lib/services/cronogramaDependencias'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { actividadId } = (await request.json().catch(() => ({}))) as { actividadId?: string }
    if (!actividadId) return NextResponse.json({ error: 'Falta actividadId' }, { status: 400 })

    const actividad = await prisma.proyectoActividad.findFirst({
      where: { id: actividadId, proyectoEdt: { proyectoId } },
      select: { proyectoCronogramaId: true, proyectoTarea: { orderBy: { orden: 'asc' }, select: { id: true, nombre: true } } },
    })
    if (!actividad) return NextResponse.json({ error: 'Actividad no encontrada en este proyecto' }, { status: 404 })
    const tareas = actividad.proyectoTarea
    if (tareas.length < 2) return NextResponse.json({ error: 'La actividad necesita al menos 2 tareas' }, { status: 400 })

    const permiso = await validarPermisoCronogramaPorTarea(tareas[0].id)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(actividad.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    // Todas las dependencias del cronograma, para detectar ciclos (se van sumando las nuevas).
    const deps = await prisma.proyectoDependenciasTarea.findMany({
      where: { tareaOrigen: { proyectoCronogramaId: actividad.proyectoCronogramaId } },
      select: { tareaOrigenId: true, tareaDependienteId: true },
    })
    const nuevas: { tareaOrigenId: string; tareaDependienteId: string }[] = []
    let yaVinculadas = 0
    const ciclos: string[] = []
    for (let i = 1; i < tareas.length; i++) {
      const a = tareas[i - 1].id
      const b = tareas[i].id
      if (deps.some((d) => (d.tareaOrigenId === a && d.tareaDependienteId === b) || (d.tareaOrigenId === b && d.tareaDependienteId === a))) {
        yaVinculadas++
        continue
      }
      if (creaCiclo(deps, a, b)) {
        ciclos.push(`${tareas[i - 1].nombre} → ${tareas[i].nombre}`)
        continue
      }
      const d = { tareaOrigenId: a, tareaDependienteId: b }
      deps.push(d)
      nuevas.push(d)
    }

    if (nuevas.length) {
      await prisma.proyectoDependenciasTarea.createMany({
        data: nuevas.map((d) => ({ id: crypto.randomUUID(), ...d, tipo: 'finish_to_start', lagMinutos: 0 })),
      })
    }

    return NextResponse.json({ success: true, data: { creadas: nuevas.length, yaVinculadas, ciclos } })
  } catch (error) {
    logger.error('❌ Error encadenando tareas de la actividad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
