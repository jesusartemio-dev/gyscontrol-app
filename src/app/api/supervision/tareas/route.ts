/**
 * API para gestion de tareas desde supervision
 * Permite ver todas las tareas de todos los proyectos, asignarlas y crear tareas extra
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedRoles = ['admin', 'coordinador', 'gestor', 'proyectos']
    if (!allowedRoles.includes(userRole || '')) {
      return NextResponse.json({ error: 'No tiene permisos para gestionar tareas' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const responsableId = searchParams.get('responsableId')
    const estado = searchParams.get('estado')
    const soloSinAsignar = searchParams.get('sinAsignar') === 'true'

    // Obtener ProyectoTareas (tareas del cronograma de EJECUCIÓN únicamente)
    const whereProyectoTarea: any = {
      proyectoEdt: { proyectoCronograma: { tipo: 'ejecucion' } }
    }
    if (proyectoId) whereProyectoTarea.proyectoEdt.proyectoId = proyectoId
    if (responsableId) whereProyectoTarea.responsableId = responsableId
    else if (soloSinAsignar) whereProyectoTarea.responsableId = null
    if (estado) whereProyectoTarea.estado = estado

    const proyectoTareas = await prisma.proyectoTarea.findMany({
      where: whereProyectoTarea,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        creadoPor: { select: { id: true, name: true } },
        proyectoEdt: {
          include: {
            proyecto: { select: { id: true, codigo: true, nombre: true, estado: true, esInterno: true, centroCosto: { select: { nombre: true } } } }
          }
        },
        proyectoActividad: { select: { id: true, nombre: true } }
      },
      orderBy: { nombre: 'asc' }
    })

    // Obtener Tareas simples
    const whereTarea: any = { estado: { not: 'cancelada' } }
    if (proyectoId) whereTarea.proyectoServicioCotizado = { proyectoId }
    if (responsableId) whereTarea.responsableId = responsableId
    else if (soloSinAsignar) whereTarea.responsableId = null
    if (estado) whereTarea.estado = estado

    const tareasSimples = await prisma.tarea.findMany({
      where: whereTarea,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        proyectoServicioCotizado: {
          include: { proyecto: { select: { id: true, codigo: true, nombre: true, estado: true } } }
        }
      },
      orderBy: { nombre: 'asc' }
    })

    // Obtener lista de proyectos regulares (activos)
    const proyectos = await prisma.proyecto.findMany({
      where: {
        esInterno: false,
        estado: { in: ['creado', 'en_ejecucion', 'en_planificacion', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados'] }
      },
      select: { id: true, codigo: true, nombre: true, estado: true },
      orderBy: { codigo: 'asc' }
    })

    // Obtener proyectos internos (activos)
    const proyectosInternos = await prisma.proyecto.findMany({
      where: {
        esInterno: true,
        estado: { notIn: ['cerrado', 'cancelado'] }
      },
      select: { id: true, codigo: true, nombre: true, centroCosto: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' }
    })

    // Obtener usuarios para asignación
    const usuarios = await prisma.user.findMany({
      where: { role: { in: ['colaborador', 'proyectos', 'coordinador', 'gestor', 'admin'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' }
    })

    // Formatear tareas de ProyectoTarea
    const tareasFormateadas = proyectoTareas.map(t => {
      const edtNombre = t.proyectoEdt?.nombre || 'Sin EDT'
      const esExtra = t.descripcion?.startsWith('[EXTRA]') || false
      const descripcionLimpia = esExtra ? t.descripcion?.replace('[EXTRA]', '').trim() : t.descripcion
      const esInterno = t.proyectoEdt?.proyecto?.esInterno || false
      return {
        id: t.id,
        tipo: 'proyecto_tarea' as const,
        nombre: t.nombre,
        descripcion: descripcionLimpia,
        proyectoId: t.proyectoEdt?.proyecto?.id || null,
        proyectoCodigo: t.proyectoEdt?.proyecto?.codigo || 'Sin proyecto',
        proyectoNombre: t.proyectoEdt?.proyecto?.nombre || 'Sin proyecto',
        esInterno,
        centroCostoNombre: esInterno ? (t.proyectoEdt?.proyecto?.centroCosto?.nombre || null) : null,
        edtNombre,
        proyectoEdtId: t.proyectoEdtId,
        actividadNombre: t.proyectoActividad?.nombre || null,
        esExtra,
        responsableId: t.responsableId,
        responsableNombre: t.user?.name || null,
        responsableEmail: t.user?.email || null,
        creadoPorId: t.creadoPorId || null,
        creadoPorNombre: t.creadoPor?.name || null,
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        horasPlan: (t.horasEstimadas ? Number(t.horasEstimadas) : 0) * ((t as any).personasEstimadas || 1),
        horasReales: t.horasReales ? Number(t.horasReales) : 0,
        personasEstimadas: (t as any).personasEstimadas || 1,
        progreso: t.porcentajeCompletado || 0,
        estado: t.estado,
        prioridad: t.prioridad || 'media'
      }
    })

    // Formatear Tareas simples
    const tareasFormateadasSimples = tareasSimples.map(t => ({
      id: t.id,
      tipo: 'tarea' as const,
      nombre: t.nombre,
      descripcion: t.descripcion,
      proyectoId: t.proyectoServicioCotizado?.proyecto?.id || null,
      proyectoCodigo: t.proyectoServicioCotizado?.proyecto?.codigo || 'Sin proyecto',
      proyectoNombre: t.proyectoServicioCotizado?.proyecto?.nombre || 'Sin proyecto',
      esInterno: false,
      centroCostoNombre: null as string | null,
      edtNombre: 'Tarea simple',
      proyectoEdtId: null as string | null,
      actividadNombre: null as string | null,
      esExtra: false,
      responsableId: t.responsableId,
      responsableNombre: t.user?.name || null,
      responsableEmail: t.user?.email || null,
      creadoPorId: null,
      creadoPorNombre: null,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      horasPlan: t.horasEstimadas ? Number(t.horasEstimadas) : 0,
      horasReales: t.horasReales ? Number(t.horasReales) : 0,
      personasEstimadas: 1,
      progreso: t.porcentajeCompletado || 0,
      estado: t.estado,
      prioridad: t.prioridad || 'media'
    }))

    const todasLasTareas = [...tareasFormateadas, ...tareasFormateadasSimples]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))

    const totalTareas = todasLasTareas.length
    const tareasCompletadas = todasLasTareas.filter(t => t.estado === 'completada').length
    const tareasEnProgreso = todasLasTareas.filter(t => t.estado === 'en_progreso').length
    const tareasPendientes = todasLasTareas.filter(t => t.estado === 'pendiente').length
    const tareasSinAsignar = todasLasTareas.filter(t => !t.responsableId).length
    const ahora = new Date()
    const tareasVencidas = todasLasTareas.filter(t =>
      t.estado !== 'completada' && t.estado !== 'cancelada' && new Date(t.fechaFin) < ahora
    ).length
    const tareasProximasVencer = todasLasTareas.filter(t => {
      if (t.estado === 'completada' || t.estado === 'cancelada') return false
      const dias = Math.ceil((new Date(t.fechaFin).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
      return dias >= 0 && dias <= 7
    }).length

    return NextResponse.json({
      success: true,
      data: {
        tareas: todasLasTareas,
        proyectos,
        proyectosInternos,
        usuarios,
        metricas: { totalTareas, tareasCompletadas, tareasEnProgreso, tareasPendientes, tareasSinAsignar, tareasVencidas, tareasProximasVencer }
      }
    })

  } catch (error) {
    console.error('Error obteniendo tareas de supervision:', error)
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido', success: false }, { status: 500 })
  }
}

// PATCH - Asignar o actualizar tarea
export async function PATCH(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const userRole = session.user.role
    if (!['admin', 'coordinador', 'gestor', 'proyectos'].includes(userRole || '')) {
      return NextResponse.json({ error: 'No tiene permisos para asignar tareas' }, { status: 403 })
    }

    const body = await request.json()
    const { tareaId, tipo, responsableId, estado, prioridad, porcentajeCompletado, personasEstimadas, nombre, descripcion, fechaInicio, fechaFin, horasEstimadas } = body

    if (!tareaId || !tipo) return NextResponse.json({ error: 'Se requiere tareaId y tipo' }, { status: 400 })

    let tareaActualizada

    if (tipo === 'proyecto_tarea') {
      const updateData: any = { updatedAt: new Date() }
      if (nombre !== undefined) updateData.nombre = nombre
      if (descripcion !== undefined) updateData.descripcion = descripcion
      if (fechaInicio !== undefined) updateData.fechaInicio = new Date(fechaInicio)
      if (fechaFin !== undefined) updateData.fechaFin = new Date(fechaFin)
      if (horasEstimadas !== undefined) updateData.horasEstimadas = parseFloat(horasEstimadas)
      if (responsableId !== undefined) updateData.responsableId = responsableId || null
      if (estado) { updateData.estado = estado; if (estado === 'completada') updateData.porcentajeCompletado = 100 }
      if (prioridad) updateData.prioridad = prioridad
      if (porcentajeCompletado !== undefined && estado !== 'completada') updateData.porcentajeCompletado = Math.min(100, Math.max(0, porcentajeCompletado))
      if (personasEstimadas !== undefined) updateData.personasEstimadas = Math.max(1, parseInt(personasEstimadas) || 1)
      tareaActualizada = await prisma.proyectoTarea.update({ where: { id: tareaId }, data: updateData, include: { user: { select: { id: true, name: true, email: true } } } })
    } else {
      const updateData: any = { updatedAt: new Date() }
      if (nombre !== undefined) updateData.nombre = nombre
      if (descripcion !== undefined) updateData.descripcion = descripcion
      if (fechaInicio !== undefined) updateData.fechaInicio = new Date(fechaInicio)
      if (fechaFin !== undefined) updateData.fechaFin = new Date(fechaFin)
      if (responsableId !== undefined) updateData.responsableId = responsableId || null
      if (estado) { updateData.estado = estado; if (estado === 'completada') updateData.porcentajeCompletado = 100 }
      if (prioridad) updateData.prioridad = prioridad
      if (porcentajeCompletado !== undefined && estado !== 'completada') updateData.porcentajeCompletado = Math.min(100, Math.max(0, porcentajeCompletado))
      tareaActualizada = await prisma.tarea.update({ where: { id: tareaId }, data: updateData, include: { user: { select: { id: true, name: true, email: true } } } })
    }

    return NextResponse.json({ success: true, data: tareaActualizada, message: 'Tarea actualizada correctamente' })

  } catch (error) {
    console.error('Error actualizando tarea:', error)
    return NextResponse.json({ error: 'Error al actualizar tarea', details: error instanceof Error ? error.message : 'Error desconocido', success: false }, { status: 500 })
  }
}

// POST - Crear tarea extra (no planificada)
export async function POST(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const userRole = session.user.role
    if (!['admin', 'coordinador', 'gestor', 'proyectos'].includes(userRole || '')) {
      return NextResponse.json({ error: 'No tiene permisos para crear tareas' }, { status: 403 })
    }

    const body = await request.json()
    const { proyectoId, proyectoEdtId, nombre, descripcion, fechaInicio, fechaFin, responsableId, prioridad = 'media', horasEstimadas, personasEstimadas } = body

    if (!proyectoId) return NextResponse.json({ error: 'El proyecto es requerido' }, { status: 400 })
    if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre de la tarea es requerido' }, { status: 400 })
    if (!fechaInicio || !fechaFin) return NextResponse.json({ error: 'Las fechas de inicio y fin son requeridas' }, { status: 400 })

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, codigo: true, nombre: true, esInterno: true }
    })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // Para proyectos internos: el EDT es automático ("General"), no se requiere del usuario
    let edtIdFinal: string = ''
    let cronogramaId: string = ''

    if (proyecto.esInterno) {
      // Buscar o auto-crear el cronograma de ejecución del proyecto interno
      let cronograma = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId, tipo: 'ejecucion' }
      })
      if (!cronograma) {
        cronograma = await prisma.proyectoCronograma.create({
          data: {
            id: randomUUID(),
            proyectoId,
            tipo: 'ejecucion',
            nombre: 'Ejecución',
            updatedAt: new Date(),
          }
        })
      }
      cronogramaId = cronograma.id

      // Intentar usar el EDT seleccionado explícitamente
      if (proyectoEdtId) {
        const edtElegido = await prisma.proyectoEdt.findFirst({
          where: { id: proyectoEdtId, proyectoId, proyectoCronogramaId: cronograma.id }
        })
        if (edtElegido) edtIdFinal = edtElegido.id
      }

      // Si no hay EDT resuelto, buscar o auto-crear el EDT "GEN" (convención de proyectos internos)
      if (!edtIdFinal) {
        let edtGen = await prisma.proyectoEdt.findFirst({
          where: { proyectoId, proyectoCronogramaId: cronograma.id, nombre: 'GEN' }
        })
        if (!edtGen) {
          // Asegurar que exista "GEN" en el catálogo Edt
          const edtCatalog = await prisma.edt.upsert({
            where: { nombre: 'GEN' },
            create: { nombre: 'GEN', updatedAt: new Date() },
            update: {}
          })
          edtGen = await prisma.proyectoEdt.create({
            data: {
              id: randomUUID(),
              proyectoId,
              proyectoCronogramaId: cronograma.id,
              edtId: edtCatalog.id,
              nombre: 'GEN',
              orden: 1,
              updatedAt: new Date(),
            }
          })
        }
        edtIdFinal = edtGen.id
      }
    } else {
      // Proyecto regular: EDT requerido
      if (!proyectoEdtId) return NextResponse.json({ error: 'El EDT es requerido' }, { status: 400 })

      const proyectoEdtOriginal = await prisma.proyectoEdt.findFirst({
        where: { id: proyectoEdtId, proyectoId },
        include: { proyectoCronograma: true }
      })
      if (!proyectoEdtOriginal) return NextResponse.json({ error: 'El EDT no existe o no pertenece al proyecto' }, { status: 400 })

      const cronogramaEjecucion = await prisma.proyectoCronograma.findFirst({ where: { proyectoId, tipo: 'ejecucion' } })
      if (!cronogramaEjecucion) {
        return NextResponse.json({
          error: 'El proyecto no tiene un Cronograma de Ejecución. Debe crearlo primero en la sección de Cronograma del proyecto.',
          code: 'MISSING_EXECUTION_SCHEDULE'
        }, { status: 400 })
      }

      const edtEnEjecucion = await prisma.proyectoEdt.findFirst({
        where: { proyectoId, proyectoCronogramaId: cronogramaEjecucion.id, nombre: proyectoEdtOriginal.nombre }
      })
      edtIdFinal = (edtEnEjecucion || proyectoEdtOriginal).id
      cronogramaId = cronogramaEjecucion.id
    }

    const personas = personasEstimadas && parseInt(personasEstimadas) > 0 ? parseInt(personasEstimadas) : 1
    const nuevaTarea = await prisma.proyectoTarea.create({
      data: {
        id: randomUUID(),
        proyectoEdtId: edtIdFinal,
        proyectoCronogramaId: cronogramaId,
        nombre: nombre.trim(),
        descripcion: `[EXTRA]${descripcion?.trim() || ''}`,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        responsableId: responsableId || null,
        creadoPorId: session.user.id,
        prioridad,
        horasEstimadas: horasEstimadas ? parseFloat(horasEstimadas) : null,
        personasEstimadas: personas,
        estado: 'pendiente',
        orden: 0,
        updatedAt: new Date()
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        proyectoEdt: { include: { proyecto: { select: { id: true, codigo: true, nombre: true, esInterno: true, centroCosto: { select: { nombre: true } } } } } }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: nuevaTarea.id,
        tipo: 'proyecto_tarea',
        nombre: nuevaTarea.nombre,
        descripcion: descripcion?.trim() || null,
        proyectoId: proyecto.id,
        proyectoCodigo: proyecto.codigo,
        proyectoNombre: proyecto.nombre,
        esInterno: proyecto.esInterno,
        edtNombre: nuevaTarea.proyectoEdt?.nombre || 'General',
        esExtra: true,
        responsableId: nuevaTarea.responsableId,
        responsableNombre: nuevaTarea.user?.name || null,
        creadoPorId: session.user.id,
        creadoPorNombre: session.user.name || null,
        fechaInicio: nuevaTarea.fechaInicio,
        fechaFin: nuevaTarea.fechaFin,
        horasPlan: nuevaTarea.horasEstimadas ? Number(nuevaTarea.horasEstimadas) * personas : 0,
        progreso: 0,
        estado: nuevaTarea.estado,
        prioridad: nuevaTarea.prioridad
      },
      message: 'Tarea creada correctamente'
    })

  } catch (error) {
    console.error('Error creando tarea extra:', error)
    return NextResponse.json({ error: 'Error al crear tarea', details: error instanceof Error ? error.message : 'Error desconocido', success: false }, { status: 500 })
  }
}
