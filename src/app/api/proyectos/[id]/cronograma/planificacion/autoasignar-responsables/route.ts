import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { resolverOrganigramaProyecto } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { resolverResponsableTarea, type ResponsablePreviewEdt, type ResponsablePreviewDesglose } from '@/lib/cronogramaResponsables/asignarResponsablesEstructura'
import { registrarCargoLabelsNoReconocidos } from '@/lib/cronogramaResponsables/auditoriaOrganigrama'
import type { RolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'

type Ctx = { params: Promise<{ id: string }> }

interface TareaResuelta {
  proyectoTareaId: string
  proyectoEdtId: string
  edtCodigo: string
  rol: RolResponsable | null
  responsableUserId: string | null
  /** true si la tarea sigue "automática" (nunca editada a mano desde la última asignación de este mecanismo) — solo estas se sobrescriben al confirmar. */
  esAutomatica: boolean
}

interface ResultadoCalculo {
  sinOrganigrama: boolean
  propuestas: ResponsablePreviewEdt[]
  tareasResueltas: TareaResuelta[]
  cargoLabelsNoReconocidos: { nodoId: string; cargoLabel: string }[]
}

/**
 * Calcula (sin escribir nada) qué responsable le corresponde a cada
 * EDT/Actividad/Tarea del cronograma según la tabla EDT->rol + el
 * organigrama del proyecto — usada tanto por el preview (GET) como por el
 * apply (POST), que SIEMPRE recalcula en vez de confiar en lo que el
 * cliente devolvió del preview. Ya NO depende de la Matriz de
 * Comunicaciones en absoluto (ni siquiera como fallback) — el organigrama
 * es la única fuente.
 */
async function calcularPropuesta(proyectoId: string, proyectoCronogramaId: string): Promise<ResultadoCalculo> {
  const orgNodos = await prisma.proyectoOrgNodo.findMany({
    where: { proyectoId },
    select: { id: true, userId: true, cargoLabel: true, orden: true, user: { select: { name: true } } },
  })
  const sinOrganigrama = orgNodos.filter(n => n.userId).length === 0
  const organigramaResuelto = resolverOrganigramaProyecto(orgNodos)

  const proyectoEdts = await prisma.proyectoEdt.findMany({
    where: { proyectoCronogramaId },
    include: { edt: { select: { nombre: true } } },
    orderBy: { orden: 'asc' },
  })
  const edtCodigoPorId = new Map(proyectoEdts.map(e => [e.id, e.edt.nombre]))

  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoEdtId: { in: proyectoEdts.map(e => e.id) } },
    select: { id: true, nombre: true, proyectoEdtId: true },
  })
  const actividadPorId = new Map(actividades.map(a => [a.id, a]))

  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoEdtId: { in: proyectoEdts.map(e => e.id) } },
    select: { id: true, nombre: true, proyectoEdtId: true, proyectoActividadId: true, responsableId: true },
  })

  // Última asignación automática registrada por tarea — determina si sigue
  // siendo "automática" (comparando contra el responsableId actual) o si un
  // humano la cambió desde entonces, caso en el que nunca se sobrescribe.
  const ultimasAsignaciones = await prisma.proyectoTareaResponsableAsignacion.findMany({
    where: { proyectoTareaId: { in: tareas.map(t => t.id) } },
    orderBy: { asignadoEn: 'desc' },
    select: { proyectoTareaId: true, responsableIdAsignado: true },
  })
  const ultimaAsignacionPorTarea = new Map<string, string>()
  for (const a of ultimasAsignaciones) {
    if (!ultimaAsignacionPorTarea.has(a.proyectoTareaId)) ultimaAsignacionPorTarea.set(a.proyectoTareaId, a.responsableIdAsignado)
  }

  const tareasResueltas: TareaResuelta[] = tareas.map(tarea => {
    const edtCodigo = edtCodigoPorId.get(tarea.proyectoEdtId) ?? ''
    const actividad = tarea.proyectoActividadId ? actividadPorId.get(tarea.proyectoActividadId) : undefined
    const resuelto = resolverResponsableTarea(
      { edtCodigo, actividadNombre: actividad?.nombre, tareaNombre: tarea.nombre },
      organigramaResuelto.porRol
    )
    const ultimaAsignacion = ultimaAsignacionPorTarea.get(tarea.id)
    const esAutomatica = ultimaAsignacion === undefined ? tarea.responsableId === null : tarea.responsableId === ultimaAsignacion

    return {
      proyectoTareaId: tarea.id,
      proyectoEdtId: tarea.proyectoEdtId,
      edtCodigo,
      rol: resuelto.rol,
      responsableUserId: resuelto.userId,
      esAutomatica,
    }
  })

  const usuarios = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(tareasResueltas.map(t => t.responsableUserId).filter((x): x is string => !!x))) } },
    select: { id: true, name: true },
  })
  const nombrePorUserId = new Map(usuarios.map(u => [u.id, u.name ?? '(sin nombre)']))

  const propuestas: ResponsablePreviewEdt[] = proyectoEdts.map(edt => {
    const edtCodigo = edt.edt.nombre
    const tareasDelEdt = tareasResueltas.filter(t => t.proyectoEdtId === edt.id)
    const resueltoEdt = resolverResponsableTarea({ edtCodigo }, organigramaResuelto.porRol)

    const desgloseMap = new Map<RolResponsable, ResponsablePreviewDesglose>()
    let tareasManuales = 0
    for (const t of tareasDelEdt) {
      if (!t.esAutomatica) tareasManuales++
      if (!t.rol) continue
      const acc = desgloseMap.get(t.rol) ?? {
        rol: t.rol,
        responsableUserId: t.responsableUserId,
        responsableNombre: t.responsableUserId ? nombrePorUserId.get(t.responsableUserId) ?? '(usuario no encontrado)' : null,
        tareasCount: 0,
      }
      acc.tareasCount++
      desgloseMap.set(t.rol, acc)
    }

    let advertencia: string | null = null
    if (!resueltoEdt.rol) {
      advertencia = `EDT "${edt.nombre}" no tiene una regla de responsable definida — queda sin asignar.`
    } else if (desgloseMap.size === 0) {
      advertencia = `No hay tareas para "${edt.nombre}".`
    } else if ([...desgloseMap.values()].every(d => !d.responsableUserId)) {
      advertencia = `Ningún rol requerido por "${edt.nombre}" tiene persona asignada en el organigrama de este proyecto.`
    }
    if (tareasManuales > 0) {
      const nota = `${tareasManuales} tarea(s) editada(s) manualmente — no se tocarán al confirmar.`
      advertencia = advertencia ? `${advertencia} ${nota}` : nota
    }

    return {
      proyectoEdtId: edt.id,
      edtNombre: edt.nombre,
      edtCodigo,
      desglose: [...desgloseMap.values()],
      advertencia,
    }
  })

  return { sinOrganigrama, propuestas, tareasResueltas, cargoLabelsNoReconocidos: organigramaResuelto.cargoLabelsNoReconocidos }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id: proyectoId } = await params
  const cronogramaId = req.nextUrl.searchParams.get('cronogramaId')
  if (!cronogramaId) {
    return NextResponse.json({ error: 'Se requiere cronogramaId' }, { status: 400 })
  }

  const validacion = await validarPermisoCronograma(cronogramaId, { ignoreBloqueo: true })
  if (!validacion.ok) return validacion.response

  const resultado = await calcularPropuesta(proyectoId, cronogramaId)
  return NextResponse.json({ sinOrganigrama: resultado.sinOrganigrama, propuestas: resultado.propuestas })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const body = await req.json().catch(() => ({}))
  const cronogramaId: string | undefined = body.cronogramaId
  if (!cronogramaId) {
    return NextResponse.json({ error: 'Se requiere cronogramaId' }, { status: 400 })
  }

  const validacion = await validarPermisoCronograma(cronogramaId)
  if (!validacion.ok) return validacion.response

  const resultado = await calcularPropuesta(proyectoId, cronogramaId)
  if (resultado.sinOrganigrama) {
    return NextResponse.json({ error: 'Este proyecto no tiene organigrama definido — créalo primero en /proyectos/[id]/organigrama.' }, { status: 409 })
  }

  // Solo tareas que siguen "automáticas" Y para las que hoy se resuelve una
  // persona real se sobrescriben — una tarea editada a mano nunca se toca,
  // y una tarea sin persona resuelta se deja como está (nunca se limpia a
  // null silenciosamente).
  const actualizables = resultado.tareasResueltas.filter(t => t.esAutomatica && t.responsableUserId)

  if (actualizables.length > 0) {
    await prisma.$transaction([
      ...actualizables.map(t =>
        prisma.proyectoTarea.update({
          where: { id: t.proyectoTareaId },
          data: { responsableId: t.responsableUserId!, updatedAt: new Date() },
        })
      ),
      prisma.proyectoTareaResponsableAsignacion.createMany({
        data: actualizables.map(t => ({
          id: randomUUID(),
          proyectoTareaId: t.proyectoTareaId,
          proyectoId,
          matrizFilaId: null,
          edtCodigo: t.edtCodigo,
          responsableIdAsignado: t.responsableUserId!,
          codigoOrigen: 'regla',
          asignadoPorId: session.user.id,
        })),
      }),
    ])
  }

  await registrarCargoLabelsNoReconocidos(session.user.id, proyectoId, resultado.cargoLabelsNoReconocidos)

  return NextResponse.json({
    propuestas: resultado.propuestas,
    tareasActualizadas: actualizables.length,
    tareasOmitidasPorEdicionManual: resultado.tareasResueltas.filter(t => !t.esAutomatica).length,
  })
}
