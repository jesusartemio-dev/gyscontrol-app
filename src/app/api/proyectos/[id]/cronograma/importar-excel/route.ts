// ===================================================
// API: Importar cronograma desde Excel de MS Project
// Crea jerarquía completa: Fases → EDTs → Actividades → Tareas
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseDuration, parseWork } from '@/lib/utils/msProjectExcelParser'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { logger } from '@/lib/logger'

interface RowData {
  id: number
  name: string
  duration: string
  work: string
  start: string | null
  finish: string | null
  predecessors: number[]
  outlineLevel: number
  notes: string
}

interface TareaData { row: RowData }
interface ActividadData { row: RowData; tareas: TareaData[] }
interface EdtData { row: RowData; actividades: ActividadData[] }
interface FaseData { row: RowData; edts: EdtData[] }

interface ImportRequest {
  project: string
  fases: FaseData[]
  stats: { fases: number; edts: number; actividades: number; tareas: number }
  edtMappings?: Record<string, string> // Excel EDT name → catalog edtId
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params
    const body: ImportRequest = await request.json()

    // Validar proyecto
    const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId } })
    if (!proyecto) {
      return NextResponse.json({ message: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Obtener horasPorDia del calendario laboral asignado al proyecto (o default activo)
    let horasPorDia = 8
    const configCalendario = await prisma.configuracionCalendario.findFirst({
      where: { entidadTipo: 'proyecto', entidadId: proyectoId },
      include: { calendarioLaboral: true },
    })
    if (configCalendario?.calendarioLaboral) {
      horasPorDia = configCalendario.calendarioLaboral.horasPorDia
    } else {
      // Fallback: buscar calendario activo por defecto
      const defaultCalendario = await prisma.calendarioLaboral.findFirst({
        where: { activo: true },
        orderBy: { createdAt: 'asc' },
      })
      if (defaultCalendario) {
        horasPorDia = defaultCalendario.horasPorDia
      }
    }

    // Buscar o crear cronograma de planificación
    let cronograma = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId, tipo: 'planificacion' },
    })

    // Check cronograma lock
    if (cronograma?.id && await isCronogramaBloqueado(cronograma.id)) {
      return cronogramaBloqueadoResponse()
    }

    if (cronograma) {
      // Verificar si ya tiene contenido
      const faseCount = await prisma.proyectoFase.count({
        where: { proyectoCronogramaId: cronograma.id },
      })
      if (faseCount > 0) {
        return NextResponse.json({
          message: 'El cronograma de planificación ya tiene contenido. Debe vaciarlo primero antes de importar.',
        }, { status: 409 })
      }
    } else {
      cronograma = await prisma.proyectoCronograma.create({
        data: {
          id: crypto.randomUUID(),
          proyectoId,
          tipo: 'planificacion',
          nombre: 'Línea Base',
          esBaseline: true,
          version: 1,
          updatedAt: new Date(),
        },
      })
    }

    // Mapeo de Excel ID → ID interno (para dependencias)
    const excelIdToInternalId = new Map<number, string>()
    // Mapeo de Excel ID → nivel (para saber qué tipo de entidad es)
    const excelIdToLevel = new Map<number, number>()

    let fasesCreadas = 0
    let edtsCreados = 0
    let actividadesCreadas = 0
    let tareasCreadas = 0
    let dependenciasCreadas = 0

    // Crear jerarquía completa
    for (let faseIdx = 0; faseIdx < body.fases.length; faseIdx++) {
      const faseData = body.fases[faseIdx]

      // Crear Fase
      const faseId = crypto.randomUUID()
      await prisma.proyectoFase.create({
        data: {
          id: faseId,
          proyectoId,
          proyectoCronogramaId: cronograma.id,
          nombre: faseData.row.name,
          descripcion: faseData.row.notes || null,
          orden: faseIdx,
          fechaInicioPlan: faseData.row.start ? new Date(faseData.row.start) : null,
          fechaFinPlan: faseData.row.finish ? new Date(faseData.row.finish) : null,
          estado: 'planificado',
          porcentajeAvance: 0,
          updatedAt: new Date(),
        },
      })
      fasesCreadas++
      if (faseData.row.id > 0) {
        excelIdToInternalId.set(faseData.row.id, faseId)
        excelIdToLevel.set(faseData.row.id, 2)
      }

      // Crear EDTs dentro de la fase
      for (let edtIdx = 0; edtIdx < faseData.edts.length; edtIdx++) {
        const edtData = faseData.edts[edtIdx]

        // Resolve EDT catalog entry: use mapping if provided, otherwise find/create
        let edtMaestroId: string
        if (body.edtMappings?.[edtData.row.name]) {
          edtMaestroId = body.edtMappings[edtData.row.name]
        } else {
          let edtMaestro = await prisma.edt.findFirst({
            where: { nombre: edtData.row.name },
          })
          if (!edtMaestro) {
            edtMaestro = await prisma.edt.create({
              data: {
                nombre: edtData.row.name,
                descripcion: edtData.row.notes || null,
              },
            })
          }
          edtMaestroId = edtMaestro.id
        }

        const dur = parseDuration(edtData.row.duration, horasPorDia)
        const proyectoEdtId = crypto.randomUUID()

        await prisma.proyectoEdt.create({
          data: {
            id: proyectoEdtId,
            proyectoId,
            proyectoCronogramaId: cronograma.id,
            proyectoFaseId: faseId,
            edtId: edtMaestroId,
            nombre: edtData.row.name,
            descripcion: edtData.row.notes || null,
            orden: edtIdx,
            fechaInicioPlan: edtData.row.start ? new Date(edtData.row.start) : null,
            fechaFinPlan: edtData.row.finish ? new Date(edtData.row.finish) : null,
            horasPlan: dur.hours,
            estado: 'planificado',
            prioridad: 'media',
            porcentajeAvance: 0,
            updatedAt: new Date(),
          },
        })
        edtsCreados++
        if (edtData.row.id > 0) {
          excelIdToInternalId.set(edtData.row.id, proyectoEdtId)
          excelIdToLevel.set(edtData.row.id, 3)
        }

        // Crear Actividades dentro del EDT
        for (let actIdx = 0; actIdx < edtData.actividades.length; actIdx++) {
          const actData = edtData.actividades[actIdx]
          const actDur = parseDuration(actData.row.duration, horasPorDia)
          const actividadId = crypto.randomUUID()

          // Actividad requiere fechas, usar defaults si no hay
          const actStart = actData.row.start
            ? new Date(actData.row.start)
            : (edtData.row.start ? new Date(edtData.row.start) : new Date())
          const actFinish = actData.row.finish
            ? new Date(actData.row.finish)
            : (edtData.row.finish ? new Date(edtData.row.finish) : new Date())

          await prisma.proyectoActividad.create({
            data: {
              id: actividadId,
              proyectoEdtId: proyectoEdtId,
              proyectoCronogramaId: cronograma.id,
              nombre: actData.row.name,
              descripcion: actData.row.notes || null,
              orden: actIdx,
              fechaInicioPlan: actStart,
              fechaFinPlan: actFinish,
              horasPlan: actDur.hours,
              estado: 'pendiente',
              prioridad: 'media',
              porcentajeAvance: 0,
              updatedAt: new Date(),
            },
          })
          actividadesCreadas++
          if (actData.row.id > 0) {
            excelIdToInternalId.set(actData.row.id, actividadId)
            excelIdToLevel.set(actData.row.id, 4)
          }

          // Crear Tareas dentro de la Actividad
          for (let tareaIdx = 0; tareaIdx < actData.tareas.length; tareaIdx++) {
            const tareaData = actData.tareas[tareaIdx]
            const tareaDur = parseDuration(tareaData.row.duration, horasPorDia)
            const tareaWork = parseWork(tareaData.row.work, horasPorDia)
            const tareaId = crypto.randomUUID()

            // Si Work is available, use it as horasEstimadas (total person-hours)
            // Otherwise fallback to Duration × horasPorDia (single-person hours)
            const horasEstimadas = tareaWork > 0 ? tareaWork : tareaDur.hours

            // Calculate personasEstimadas: Work / (Duration × horasPorDia)
            // If Work = Duration × horasPorDia → 1 person; if Work > → multiple people
            let personasEstimadas = 1
            if (tareaWork > 0 && tareaDur.hours > 0) {
              personasEstimadas = Math.max(1, Math.round(tareaWork / tareaDur.hours))
            }

            const tareaStart = tareaData.row.start
              ? new Date(tareaData.row.start)
              : actStart
            const tareaFinish = tareaData.row.finish
              ? new Date(tareaData.row.finish)
              : actFinish

            await prisma.proyectoTarea.create({
              data: {
                id: tareaId,
                proyectoEdtId: proyectoEdtId,
                proyectoCronogramaId: cronograma.id,
                proyectoActividadId: actividadId,
                nombre: tareaData.row.name,
                descripcion: tareaData.row.notes || null,
                orden: tareaIdx,
                fechaInicio: tareaStart,
                fechaFin: tareaFinish,
                horasEstimadas,
                personasEstimadas,
                estado: 'pendiente',
                prioridad: 'media',
                porcentajeCompletado: 0,
                updatedAt: new Date(),
              },
            })
            tareasCreadas++
            if (tareaData.row.id > 0) {
              excelIdToInternalId.set(tareaData.row.id, tareaId)
              excelIdToLevel.set(tareaData.row.id, 5)
            }
          }
        }
      }
    }

    // Crear dependencias entre tareas (solo nivel 5 → nivel 5)
    const allTareas = body.fases.flatMap(f =>
      f.edts.flatMap(e =>
        e.actividades.flatMap(a =>
          a.tareas
        )
      )
    )

    for (const tarea of allTareas) {
      if (tarea.row.predecessors.length === 0) continue

      const dependienteId = excelIdToInternalId.get(tarea.row.id)
      if (!dependienteId) continue

      for (const predExcelId of tarea.row.predecessors) {
        const origenId = excelIdToInternalId.get(predExcelId)
        if (!origenId) continue

        // Solo crear dependencia si ambas son tareas (nivel 5)
        const origenLevel = excelIdToLevel.get(predExcelId)
        const depLevel = excelIdToLevel.get(tarea.row.id)

        // Permitir dependencias entre cualquier entidad del mismo tipo o tareas
        if (origenId === dependienteId) continue

        // Solo crear como ProyectoDependenciasTarea si ambas son tareas
        if (origenLevel === 5 && depLevel === 5) {
          try {
            await prisma.proyectoDependenciasTarea.create({
              data: {
                id: crypto.randomUUID(),
                tareaOrigenId: origenId,
                tareaDependienteId: dependienteId,
                tipo: 'finish_to_start',
                updatedAt: new Date(),
              },
            })
            dependenciasCreadas++
          } catch {
            // Ignorar duplicados u errores de constraint
          }
        }
      }
    }

    // Asegurar que el cronograma es baseline
    if (!cronograma.esBaseline) {
      // Desmarcar otros baselines
      await prisma.proyectoCronograma.updateMany({
        where: { proyectoId, esBaseline: true },
        data: { esBaseline: false },
      })
      await prisma.proyectoCronograma.update({
        where: { id: cronograma.id },
        data: { esBaseline: true },
      })
    }

    return NextResponse.json({
      success: true,
      cronogramaId: cronograma.id,
      horasPorDia,
      stats: {
        fases: fasesCreadas,
        edts: edtsCreados,
        actividades: actividadesCreadas,
        tareas: tareasCreadas,
        dependencias: dependenciasCreadas,
      },
    })
  } catch (error) {
    logger.error('[ERROR importar-excel]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error del servidor' },
      { status: 500 }
    )
  }
}
