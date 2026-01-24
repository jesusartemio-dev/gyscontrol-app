// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/edts
// 🔧 Descripción: API para gestionar EDTs de una cotización (6 niveles con lógica automática)
// ✅ GET: Listar EDTs de una cotización con filtros y estadísticas
// ✅ POST: Crear nuevo EDT con opción de jerarquía automática (zona + actividad)
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validación para crear EDT
const createEdtSchema = z.object({
  cotizacionServicioId: z.string().min(1, 'El servicio es requerido'),
  cotizacionFaseId: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  fechaInicioComercial: z.string().datetime().optional(),
  fechaFinComercial: z.string().datetime().optional(),
  horasEstimadas: z.number().min(0).optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'pausado', 'cancelado']).default('planificado'),
  responsableId: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  // 🔥 NUEVO: Control de creación automática de jerarquía
  crearJerarquiaAutomatica: z.boolean().default(true).describe('Crear zona y actividad automáticamente')
})

// ✅ GET /api/cotizaciones/[id]/edts - Listar EDTs de una cotización con filtros
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

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
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver los EDTs' }, { status: 403 })
    }

    // Construir filtros
    const where: any = {
      cotizacionId: id
    }

    // Filtros opcionales
    const edtId = searchParams.get('edtId')
    if (edtId) {
      where.edtId = edtId
    }

    const estado = searchParams.get('estado')
    if (estado) {
      where.estado = estado
    }

    const responsableId = searchParams.get('responsableId')
    if (responsableId) {
      where.responsableId = responsableId
    }

    // Nota: Los EDTs no tienen zonaId directa, las zonas pertenecen a EDTs

    // Obtener EDTs con estadísticas
    const edts = await prisma.cotizacionEdt.findMany({
      where,
      include: {
        cotizacionServicio: true,
        cotizacionFase: true,
        edt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cotizacionActividad: {
          include: {
            cotizacionTarea: true
          }
        }
      },
      orderBy: [
        { cotizacionFase: { orden: 'asc' } },
        { createdAt: 'asc' }
      ]
    })

    // ✅ Calcular estadísticas para cada EDT
    const edtsConEstadisticas = edts.map(edt => {
      const totalActividades = edt.cotizacionActividad?.length || 0
      const totalTareas = edt.cotizacionActividad?.reduce((acc: number, act) => acc + (act.cotizacionTarea?.length || 0), 0) || 0
      const tareasCompletadas = edt.cotizacionActividad?.reduce((acc: number, act) =>
        acc + (act.cotizacionTarea?.filter((t: { estado: string }) => t.estado === 'completada').length || 0), 0
      ) || 0
      const porcentajeAvance = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0

      return {
        ...edt,
        estadisticas: {
          totalActividades,
          totalTareas,
          tareasCompletadas,
          porcentajeAvance
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: edtsConEstadisticas,
      filtros: {
        edtId,
        estado,
        responsableId
      }
    })

  } catch (error) {
    console.error('❌ Error al obtener EDTs:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ POST /api/cotizaciones/[id]/edts - Crear nuevo EDT
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
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para crear EDTs' }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = createEdtSchema.parse(body)

    // Verificar que el servicio existe y pertenece a la cotización
    const servicio = await prisma.cotizacionServicio.findFirst({
      where: {
        id: validatedData.cotizacionServicioId,
        cotizacionId: id
      }
    })

    if (!servicio) {
      return NextResponse.json({
        error: 'Servicio no encontrado o no pertenece a esta cotización'
      }, { status: 400 })
    }

    // Nota: Los EDTs no requieren zona específica en la creación

    // Verificar fase si se especifica
    if (validatedData.cotizacionFaseId) {
      const fase = await prisma.cotizacionFase.findFirst({
        where: {
          id: validatedData.cotizacionFaseId,
          cotizacionId: id
        }
      })

      if (!fase) {
        return NextResponse.json({
          error: 'Fase no encontrada o no pertenece a esta cotización'
        }, { status: 400 })
      }
    }

    // Verificar unicidad (servicio)
    const edtExistente = await prisma.cotizacionEdt.findFirst({
      where: {
        cotizacionId: id,
        cotizacionServicioId: validatedData.cotizacionServicioId
      }
    })

    if (edtExistente) {
      return NextResponse.json({
        error: 'Ya existe un EDT para este servicio en la zona especificada'
      }, { status: 400 })
    }

    // Crear el EDT
    const nuevoEdt = await prisma.cotizacionEdt.create({
      data: {
        id: crypto.randomUUID(),
        cotizacionId: id,
        cotizacionServicioId: validatedData.cotizacionServicioId,
        cotizacionFaseId: validatedData.cotizacionFaseId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        fechaInicioComercial: validatedData.fechaInicioComercial ? new Date(validatedData.fechaInicioComercial) : null,
        fechaFinComercial: validatedData.fechaFinComercial ? new Date(validatedData.fechaFinComercial) : null,
        horasEstimadas: validatedData.horasEstimadas,
        estado: validatedData.estado,
        responsableId: validatedData.responsableId,
        prioridad: validatedData.prioridad,
        updatedAt: new Date()
      },
      include: {
        cotizacionServicio: true,
        cotizacionFase: true,
        edt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cotizacionActividad: {
          include: {
            cotizacionTarea: true
          }
        }
      }
    })

    // ✅ SISTEMA SIMPLIFICADO: EDT creado sin jerarquía automática
    // En la jerarquía de 5 niveles, las actividades se crean manualmente bajo EDTs
    const jerarquiaCreada = null

    return NextResponse.json({
      success: true,
      data: nuevoEdt,
      jerarquiaCreada,
      message: validatedData.crearJerarquiaAutomatica && jerarquiaCreada
        ? 'EDT creado exitosamente con jerarquía automática'
        : 'EDT creado exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error al crear EDT:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}