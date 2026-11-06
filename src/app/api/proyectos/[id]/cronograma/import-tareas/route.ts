// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/import-tareas/route.ts
// 🔧 Descripción: API para importar tareas desde catálogo de servicios para una actividad específica
// 🎯 Funcionalidades: Obtener servicios disponibles para importar como tareas en una actividad
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-31
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { validarPermisoCronogramaPorActividad } from '@/lib/services/cronogramaPermisos'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { obtenerCalendarioProyecto } from '@/lib/services/cronogramaDesplazamiento'
import { siguienteMomentoLaborable, sumarHorasLaborables } from '@/lib/services/cronogramaHoras'
import { recalcularPadresPostOperacion } from '@/lib/utils/cronogramaRollup'
import { calcularHorasEstimadas, esServicioObsoleto } from '@/lib/cronogramaIA/reglasActividades'

// ✅ GET /api/proyectos/[id]/cronograma/import-tareas - Obtener servicios disponibles para importar como tareas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const actividadId = searchParams.get('actividadId')

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Limpiar el ID de actividad (remover prefijo si existe)
    const cleanActividadId = actividadId ? actividadId.replace(/^actividad-/, '') : ''

    // ✅ Validar que la actividad existe y pertenece al proyecto
    if (cleanActividadId) {
      const actividad = await prisma.proyectoActividad.findFirst({
        where: {
          id: cleanActividadId
        },
        include: {
          proyectoEdt: {
            select: { id: true, nombre: true, edtId: true }
          },
          proyectoCronograma: {
            select: { proyectoId: true }
          }
        }
      })

      // Validar que la actividad pertenece al proyecto
      if (actividad?.proyectoCronograma?.proyectoId !== id) {
        return NextResponse.json(
          { error: 'Actividad no pertenece al proyecto' },
          { status: 404 }
        )
      }

      if (!actividad) {
        return NextResponse.json(
          { error: 'Actividad no encontrada o no pertenece al proyecto' },
          { status: 404 }
        )
      }
    }

    // ✅ Obtener servicios del catálogo que correspondan al EDT de la actividad
    let serviciosQuery: any = {}
    let actividad: any = null

    if (cleanActividadId) {
      // Obtener el EDT de la actividad para filtrar servicios por categoría
      actividad = await prisma.proyectoActividad.findUnique({
        where: { id: cleanActividadId },
        include: {
          proyectoEdt: {
            select: { edtId: true }
          }
        }
      })

      if (actividad?.proyectoEdt?.edtId) {
        serviciosQuery.categoriaId = actividad.proyectoEdt.edtId
      }
    }

    const servicios = await prisma.catalogoServicio.findMany({
      where: serviciosQuery,
      include: {
        edt: {
          select: { id: true, nombre: true }
        },
        recurso: {
          select: { id: true, nombre: true, costoHora: true }
        },
        unidadServicio: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: [
        { edt: { nombre: 'asc' } },
        { orden: 'asc' },
        { nombre: 'asc' }
      ]
    })

    console.log('Servicios encontrados:', servicios.length)

    // ✅ Formatear respuesta para el modal de importación (sin los servicios
    // reemplazados [Obsoleto], que tampoco usa el generador)
    const serviciosFormateados = servicios.filter(s => !esServicioObsoleto(s)).map(servicio => ({
      id: servicio.id,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      categoria: servicio.edt.nombre,
      recurso: servicio.recurso.nombre,
      unidadServicio: servicio.unidadServicio.nombre,
      cantidad: servicio.cantidad,
      horaBase: servicio.horaBase,
      horaRepetido: servicio.horaRepetido,
      costoHora: servicio.recurso.costoHora,
      orden: servicio.orden,
      nivelDificultad: servicio.nivelDificultad,
      // Horas como las calcula el generador (las mismas con que se crea la tarea)
      horasEstimadas: calcularHorasEstimadas(servicio.horaBase, servicio.horaRepetido, servicio.cantidad ?? 1, servicio.nivelDificultad ?? 1),
      // Información adicional para el modal
      metadata: {
        tipo: 'servicio',
        origen: 'catalogo'
      }
    }))

    console.log('Servicios formateados:', serviciosFormateados.length)

    return NextResponse.json({
      success: true,
      data: serviciosFormateados
    })

  } catch (error) {
    logger.error('Error al obtener servicios para importar:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/import-tareas - Importar servicios seleccionados como tareas en una actividad
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { actividadId, selectedIds } = body

    // ✅ Validaciones
    if (!actividadId || !selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere actividadId y selectedIds (array no vacío)' },
        { status: 400 }
      )
    }

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Limpiar el ID de actividad (remover prefijo si existe)
    const cleanActividadId = actividadId.replace(/^actividad-/, '')

    // ✅ Validar permisos: solo admin/gerente/gestor/coordinador y NO en cronograma comercial
    const permiso = await validarPermisoCronogramaPorActividad(cleanActividadId)
    if (!permiso.ok) return permiso.response

    // ✅ Validar que la actividad existe y pertenece al proyecto
    const actividad = await prisma.proyectoActividad.findFirst({
      where: {
        id: cleanActividadId
      },
      include: {
        proyectoEdt: true,
        proyectoCronograma: {
          select: { proyectoId: true }
        }
      }
    })

    // Validar que la actividad pertenece al proyecto
    if (actividad?.proyectoCronograma?.proyectoId !== id) {
      return NextResponse.json(
        { error: 'Actividad no pertenece al proyecto' },
        { status: 404 }
      )
    }

    if (!actividad) {
      return NextResponse.json(
        { error: 'Actividad no encontrada o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    if (await isCronogramaBloqueado(actividad.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    // ✅ Servicios seleccionados, en el orden del catálogo
    const servicios = await prisma.catalogoServicio.findMany({
      where: { id: { in: selectedIds } },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    })

    // Tareas ya existentes de la actividad: las importadas van a continuación
    // (orden y fechas), en cadena por horas con el calendario del proyecto.
    const existentes = await prisma.proyectoTarea.findMany({
      where: { proyectoActividadId: cleanActividadId },
      select: { orden: true, fechaFin: true },
    })
    const cal = await obtenerCalendarioProyecto(id)
    let cursor = existentes.length
      ? new Date(Math.max(...existentes.map(t => t.fechaFin.getTime())))
      : actividad.fechaInicioPlan
    let orden = existentes.length ? Math.max(...existentes.map(t => t.orden)) + 1 : 0

    // Responsable: sale del rol del EDT (regla EDT → rol → organigrama), así que
    // es el mismo que ya tienen las tareas de este EDT; si no hay, el de la
    // actividad o el del EDT. Nunca se adivina.
    const hermana = await prisma.proyectoTarea.findFirst({
      where: { proyectoEdtId: actividad.proyectoEdt.id, responsableId: { not: null } },
      select: { responsableId: true },
    })
    const responsableId = hermana?.responsableId ?? actividad.responsableId ?? actividad.proyectoEdt.responsableId ?? null

    // ✅ Crear las tareas: enlazadas al servicio (catálogo y recurso), con las
    // horas del generador (base + repetido × cantidad × dificultad) y como hito ◆
    // si el servicio lo es (etiquetas Hito, HitosCliente o Hito+Nd).
    const tareasCreadas: { tarea: { id: string; nombre: string }; servicio: string }[] = []
    for (const servicio of servicios) {
      try {
        const tags = servicio.actividadTag ?? []
        const esHito = tags.some(t => /^(hito|hitoscliente|hito\+\d+d)$/i.test(t.trim()))
        const horasEstimadas = esHito
          ? 0
          : calcularHorasEstimadas(servicio.horaBase, servicio.horaRepetido, servicio.cantidad ?? 1, servicio.nivelDificultad ?? 1)
        // Un hito va justo donde termina la tarea anterior; si es la primera, al inicio de la actividad.
        const fechaInicio: Date = esHito && existentes.length + tareasCreadas.length > 0 ? cursor : siguienteMomentoLaborable(cal, cursor)
        const fechaFin: Date = esHito ? fechaInicio : sumarHorasLaborables(cal, fechaInicio, horasEstimadas)

        const tarea = await prisma.proyectoTarea.create({
          data: {
            id: crypto.randomUUID(),
            proyectoEdtId: actividad.proyectoEdt.id,
            proyectoCronogramaId: actividad.proyectoCronogramaId,
            proyectoActividadId: cleanActividadId,
            nombre: servicio.nombre,
            descripcion: servicio.descripcion,
            fechaInicio,
            fechaFin,
            horasEstimadas,
            esHito,
            catalogoServicioId: servicio.id,
            recursoId: servicio.recursoId,
            cantidad: servicio.cantidad ?? null,
            responsableId,
            estado: 'pendiente',
            prioridad: 'media',
            orden: orden++,
            creadoPorId: session?.user?.id || null,
            updatedAt: new Date()
          }
        })
        cursor = fechaFin
        tareasCreadas.push({ tarea, servicio: servicio.nombre })
      } catch (error) {
        logger.error(`Error creando tarea para servicio: ${servicio.nombre}`, error)
        // Continuar con los demás servicios
      }
    }

    // ✅ Fechas y horas hacia arriba (actividad, EDT, fase)
    if (tareasCreadas.length > 0) {
      try {
        await recalcularPadresPostOperacion(id, 'tarea', tareasCreadas[tareasCreadas.length - 1].tarea.id)
      } catch (updateError) {
        logger.error('❌ Error actualizando padres tras importar tareas:', updateError)
        // No fallar la importación por error en el rollup
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: tareasCreadas.length,
        details: tareasCreadas
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Error al importar servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}