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
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
      const actividad = await (prisma as any).proyectoActividad.findFirst({
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
      actividad = await (prisma as any).proyectoActividad.findUnique({
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

    // ✅ Formatear respuesta para el modal de importación
    const serviciosFormateados = servicios.map(servicio => ({
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
      // Calcular horas totales estimadas
      horasEstimadas: (servicio.cantidad || 0) * (servicio.horaBase || 0),
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
    console.error('Error al obtener servicios para importar:', error)
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

    // ✅ Validar que la actividad existe y pertenece al proyecto
    const actividad = await (prisma as any).proyectoActividad.findFirst({
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

    // ✅ Obtener los servicios seleccionados
    const servicios = await prisma.catalogoServicio.findMany({
      where: {
        id: { in: selectedIds }
      },
      include: {
        edt: true,
        recurso: true,
        unidadServicio: true
      }
    })

    // ✅ Crear tareas para los servicios importados en la actividad
    const tareasCreadas = []

    for (const servicio of servicios) {
      try {

        // Calcular fechas para la tarea (usar fechas de la actividad como base)
        const fechaInicio = actividad.fechaInicioPlan || new Date()
        const horasEstimadas = (servicio.cantidad || 0) * (servicio.horaBase || 0)
        const diasEstimados = Math.ceil(horasEstimadas / 8) // 8 horas por día
        const fechaFin = new Date(fechaInicio)
        fechaFin.setDate(fechaFin.getDate() + diasEstimados - 1)

        // Crear tarea dentro de la actividad
        const tarea = await (prisma as any).proyectoTarea.create({
          data: {
            proyectoEdtId: actividad.proyectoEdt.id,
            proyectoCronogramaId: actividad.proyectoCronogramaId,
            proyectoActividadId: cleanActividadId,
            nombre: servicio.nombre,
            descripcion: servicio.descripcion,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            horasEstimadas: horasEstimadas,
            estado: 'pendiente',
            prioridad: 'media',
            orden: servicio.orden || 0
          }
        })

        console.log('Tarea creada:', tarea.nombre)

        tareasCreadas.push({
          tarea: tarea,
          servicio: servicio.nombre
        })

      } catch (error) {
        console.error('Error creando tarea para servicio:', servicio.nombre, error)
        // Continuar con los demás servicios
      }
    }

    console.log('Importación completada. Creadas:', tareasCreadas.length, 'tareas')

    // ✅ Actualizar horas en la actividad padre
    if (tareasCreadas.length > 0) {
      try {
        // Calcular total de horas de las tareas recién creadas
        const totalHorasTareas = tareasCreadas.reduce((total, item) => {
          return total + (item.tarea.horasEstimadas || 0)
        }, 0)

        // Obtener horas actuales de la actividad
        const actividadActual = await (prisma as any).proyectoActividad.findUnique({
          where: { id: cleanActividadId },
          select: { horasPlan: true }
        })

        const horasActuales = actividadActual?.horasPlan || 0
        const nuevasHorasTotales = horasActuales + totalHorasTareas

        // Actualizar horas de la actividad
        await (prisma as any).proyectoActividad.update({
          where: { id: cleanActividadId },
          data: { horasPlan: nuevasHorasTotales }
        })

        console.log('✅ Horas actualizadas en actividad:', {
          actividadId: cleanActividadId,
          horasAnteriores: horasActuales,
          horasAgregadas: totalHorasTareas,
          horasTotales: nuevasHorasTotales
        })

        // ✅ Actualizar horas en el EDT padre
        const edtActual = await (prisma as any).proyectoEdt.findUnique({
          where: { id: actividad.proyectoEdt.id },
          select: { horasPlan: true, proyectoFaseId: true }
        })

        const horasEdtActuales = edtActual?.horasPlan || 0
        const nuevasHorasEdtTotales = horasEdtActuales + totalHorasTareas

        await (prisma as any).proyectoEdt.update({
          where: { id: actividad.proyectoEdt.id },
          data: { horasPlan: nuevasHorasEdtTotales }
        })

        console.log('✅ Horas actualizadas en EDT:', {
          edtId: actividad.proyectoEdt.id,
          horasAnteriores: horasEdtActuales,
          horasAgregadas: totalHorasTareas,
          horasTotales: nuevasHorasEdtTotales
        })

        // ✅ Actualizar horas en la Fase padre (si el EDT tiene fase asignada)
        if (edtActual?.proyectoFaseId) {
          const faseActual = await (prisma as any).proyectoFase.findUnique({
            where: { id: edtActual.proyectoFaseId },
            select: { horasEstimadas: true }
          })

          const horasFaseActuales = faseActual?.horasEstimadas || 0
          const nuevasHorasFaseTotales = horasFaseActuales + totalHorasTareas

          await (prisma as any).proyectoFase.update({
            where: { id: edtActual.proyectoFaseId },
            data: { horasEstimadas: nuevasHorasFaseTotales }
          })

          console.log('✅ Horas actualizadas en Fase:', {
            faseId: edtActual.proyectoFaseId,
            horasAnteriores: horasFaseActuales,
            horasAgregadas: totalHorasTareas,
            horasTotales: nuevasHorasFaseTotales
          })
        }

      } catch (updateError) {
        console.error('❌ Error actualizando horas:', updateError)
        // No fallar la importación por error en actualización de horas
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
    console.error('Error al importar servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}