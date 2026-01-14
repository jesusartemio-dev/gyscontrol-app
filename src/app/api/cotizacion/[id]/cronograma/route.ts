/**
 * 📅 API Cronograma Comercial - Cotización
 *
 * Endpoints para gestión completa del cronograma comercial de una cotización.
 * Incluye operaciones CRUD para EDTs y tareas comerciales.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { crearCotizacionEdtSchema } from '@/lib/validators/cronograma'

// ===================================================
// 📋 GET /api/cotizacion/[id]/cronograma
// ===================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const faseId = searchParams.get('faseId')

  try {
    // 📋 Checklist de validación
    // - [ ] Validar sesión
    // - [ ] Validar permisos
    // - [ ] Obtener cronograma completo
    // - [ ] Incluir relaciones necesarias

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      select: { id: true, codigo: true }
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Construir where clause con filtro opcional por fase
    const whereClause: any = { cotizacionId: id }
    if (faseId && faseId !== 'none') {
      whereClause.cotizacionFaseId = faseId
    }

    const cronograma = await prisma.cotizacionEdt.findMany({
      where: whereClause,
      include: {
        categoriaServicio: {
          select: { id: true, nombre: true }
        },
        responsable: {
          select: { id: true, name: true, email: true }
        },
        cotizacionFase: {
          select: { id: true, nombre: true }
        },
        cotizacionActividad: {
          include: {
            cotizacionTareas: {
              orderBy: { fechaInicio: 'asc' },
              include: {
                responsable: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          },
          orderBy: { fechaInicioComercial: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Flatten tasks from the hierarchy for backward compatibility
    const cronogramaConTareas = cronograma.map(edt => ({
      ...edt,
      tareas: edt.cotizacionActividad?.flatMap(actividad => actividad.cotizacionTareas || []) || []
    }))

    logger.info(`📅 Cronograma obtenido: ${cronograma.length} EDTs - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: cronogramaConTareas,
      meta: {
        totalEdts: cronogramaConTareas.length,
        totalTareas: cronogramaConTareas.reduce((sum, edt) => sum + (edt.tareas?.length || 0), 0),
        cotizacion: {
          id: cotizacion.id,
          codigo: cotizacion.codigo
        }
      }
    })

  } catch (error) {
    logger.error('❌ Error al obtener cronograma comercial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// 📝 POST /api/cotizacion/[id]/cronograma
// ===================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📥 Received body:', body)
    console.log('📥 Body types:', {
      categoriaServicioId: typeof body.categoriaServicioId,
      zona: typeof body.zona,
      fechaInicioCom: typeof body.fechaInicioCom,
      fechaFinCom: typeof body.fechaFinCom,
      horasCom: typeof body.horasCom,
      responsableId: typeof body.responsableId,
      descripcion: typeof body.descripcion,
      prioridad: typeof body.prioridad
    })

    // 📋 Checklist de validación
    // - [ ] Validar datos de entrada
    // - [ ] Verificar unicidad
    // - [ ] Verificar cotización existe
    // - [ ] Crear EDT comercial

    // Validar datos de entrada
    let validData
    try {
      validData = crearCotizacionEdtSchema.parse(body)
      console.log('✅ Validation passed:', validData)
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError)
      const errorMessage = validationError instanceof Error ? validationError.message : 'Error de validación desconocido'
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: errorMessage },
        { status: 400 }
      )
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      select: { id: true, codigo: true, estado: true }
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Temporarily skip validations for debugging
    console.log('Skipping validations for debugging...')

    // ✅ Determinar cotizacionServicioId - buscar el servicio que tiene items con la categoría seleccionada
    const cotizacionServicio = await prisma.cotizacionServicio.findFirst({
      where: {
        cotizacionId: id,
        items: {
          some: {
            catalogoServicio: {
              categoriaId: validData.categoriaServicioId
            }
          }
        }
      },
      select: { id: true }
    })

    if (!cotizacionServicio) {
      return NextResponse.json(
        { error: 'No se encontró un servicio correspondiente a la categoría seleccionada en esta cotización' },
        { status: 400 }
      )
    }

    console.log('Starting createData preparation...')

    // Preparar datos para creación - campos mínimos primero para debugging
    const createData: any = {
      cotizacionId: id,
      nombre: validData.nombre,
      cotizacionServicioId: cotizacionServicio.id,
      categoriaServicioId: validData.categoriaServicioId,
      prioridad: validData.prioridad
    }

    console.log('Base createData prepared:', createData)

    // Agregar campos opcionales solo si existen
    if (validData.fechaInicioCom) {
      createData.fechaInicioComercial = new Date(validData.fechaInicioCom)
    }
    if (validData.fechaFinCom) {
      createData.fechaFinComercial = new Date(validData.fechaFinCom)
    }
    if (validData.horasCom) {
      createData.horasEstimadas = validData.horasCom
    }
    if (validData.responsableId) {
      createData.responsableId = validData.responsableId
    }
    if (validData.descripcion) {
      createData.descripcion = validData.descripcion
    }
    if (validData.cotizacionFaseId) {
      createData.cotizacionFaseId = validData.cotizacionFaseId
    }
    // Nota: zona se omite por ahora para debugging

    console.log('🔧 Create data prepared:', createData)
    console.log('🔧 Create data keys:', Object.keys(createData))
    console.log('🔧 Create data types:', Object.fromEntries(
      Object.entries(createData).map(([key, value]) => [key, typeof value])
    ))

    const nuevoEdt = await prisma.cotizacionEdt.create({
      data: createData as any, // Type assertion to bypass type checking until Prisma client is regenerated
      include: {
        categoriaServicio: true,
        responsable: true,
        cotizacionFase: true
      }
    })

    logger.info(`✅ EDT comercial creado: ${nuevoEdt.id} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: nuevoEdt,
      message: 'EDT comercial creado exitosamente'
    }, { status: 201 })

  } catch (error) {
    logger.error('❌ Error al crear EDT comercial:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}