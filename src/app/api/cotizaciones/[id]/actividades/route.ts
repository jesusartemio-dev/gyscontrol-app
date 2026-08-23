// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/actividades
// 🔧 Descripción: API para gestionar actividades de una cotización
// ✅ GET: Listar actividades de una cotización
// ✅ POST: Crear nueva actividad en una cotización
// ===================================================

import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// ✅ SISTEMA SIMPLIFICADO: Schema para actividades directas bajo EDT
const createActividadSchema = z.object({
  cotizacionEdtId: z.string().min(1, 'EDT requerido'), // ✅ OBLIGATORIO: Solo modo EDT directo
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  fechaInicioComercial: z.string().datetime().optional(),
  fechaFinComercial: z.string().datetime().optional(),
  horasEstimadas: z.number().min(0).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada']).default('pendiente')
})

// ✅ GET /api/cotizaciones/[id]/actividades - Listar actividades de una cotización
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        user: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = tieneRol(session, ['admin', 'gerente', 'comercial']) || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver las actividades' }, { status: 403 })
    }

    // ✅ SISTEMA SIMPLIFICADO: Obtener actividades directamente por EDTs de la cotización
    const actividades = await (prisma as any).cotizacionActividad.findMany({
      where: {
        cotizacionEdt: {
          cotizacionId: id
        }
      },
      include: {
        cotizacionEdt: {
          include: {
            edt: true
          }
        },
        tareas: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            horasEstimadas: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // ✅ Todas las actividades ya están filtradas por la consulta
    const actividadesFiltradas = actividades

    // Calcular estadísticas para cada actividad
    const actividadesConEstadisticas = actividadesFiltradas.map((actividad: any) => {
      const totalTareas = actividad.tareas.length
      const tareasCompletadas = actividad.tareas.filter((t: any) => t.estado === 'completada').length
      const porcentajeAvance = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0

      return {
        ...actividad,
        estadisticas: {
          totalTareas,
          tareasCompletadas,
          porcentajeAvance
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: actividadesConEstadisticas
    })

  } catch (error) {
    console.error('❌ Error al obtener actividades:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ POST /api/cotizaciones/[id]/actividades - Crear nueva actividad
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let cotizacion = null

  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la cotización existe
    cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        user: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = tieneRol(session, ['admin', 'gerente', 'comercial']) || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para crear actividades' }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = createActividadSchema.parse(body)

    // ✅ SISTEMA SIMPLIFICADO: Solo verificar EDT directo
    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: validatedData.cotizacionEdtId,
        cotizacionId: id
      }
    })

    if (!edt) {
      return NextResponse.json({
        error: 'EDT no encontrado o no pertenece a esta cotización'
      }, { status: 400 })
    }

    // ✅ SISTEMA SIMPLIFICADO: Verificar duplicados solo en EDT directo
    const actividadDuplicada = await (prisma as any).cotizacionActividad.findFirst({
      where: {
        cotizacionEdtId: validatedData.cotizacionEdtId,
        nombre: validatedData.nombre
      }
    })

    if (actividadDuplicada) {
      return NextResponse.json({
        error: 'Ya existe una actividad con este nombre en el EDT'
      }, { status: 400 })
    }

    // ✅ SISTEMA SIMPLIFICADO: Crear actividad directamente bajo EDT
    const nuevaActividad = await (prisma as any).cotizacionActividad.create({
      data: {
        cotizacionEdtId: validatedData.cotizacionEdtId, // ✅ Solo EDT directo
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        fechaInicioComercial: validatedData.fechaInicioComercial ? new Date(validatedData.fechaInicioComercial) : null,
        fechaFinComercial: validatedData.fechaFinComercial ? new Date(validatedData.fechaFinComercial) : null,
        horasEstimadas: validatedData.horasEstimadas,
        prioridad: validatedData.prioridad,
        estado: validatedData.estado
      },
      include: {
        // ✅ EDT directo en lugar de zona
        cotizacionEdt: {
          include: {
            edt: true
          }
        },
        tareas: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            horasEstimadas: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: nuevaActividad,
      message: 'Actividad creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error al crear actividad:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}