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

    const cronograma = await prisma.cotizacionEdt.findMany({
      where: { cotizacionId: id },
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
        tareas: {
          orderBy: { createdAt: 'asc' },
          include: {
            dependencia: {
              select: { id: true, nombre: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    logger.info(`📅 Cronograma obtenido: ${cronograma.length} EDTs - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: cronograma,
      meta: {
        totalEdts: cronograma.length,
        totalTareas: cronograma.reduce((sum, edt) => sum + (edt as any).tareas?.length || 0, 0),
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

    // Verificar unicidad (cotización + categoría + zona)
    const existente = await prisma.cotizacionEdt.findFirst({
      where: {
        cotizacionId: id,
        categoriaServicioId: validData.categoriaServicioId,
        zona: validData.zona || null
      }
    })

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un EDT para esta combinación de categoría y zona' },
        { status: 400 }
      )
    }

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

    const nuevoEdt = await prisma.cotizacionEdt.create({
      data: {
        cotizacionId: id,
        nombre: validData.nombre,
        cotizacionServicioId: cotizacionServicio.id, // ✅ Campo requerido - usar el servicio correcto
        categoriaServicioId: validData.categoriaServicioId,
        zona: validData.zona,
        fechaInicioComercial: validData.fechaInicioCom ? new Date(validData.fechaInicioCom) : null,
        fechaFinComercial: validData.fechaFinCom ? new Date(validData.fechaFinCom) : null,
        horasEstimadas: validData.horasCom,
        responsableId: validData.responsableId,
        descripcion: validData.descripcion,
        prioridad: validData.prioridad,
        cotizacionFaseId: validData.cotizacionFaseId || null
      },
      include: {
        categoriaServicio: true,
        responsable: true,
        cotizacionFase: true,
        tareas: true
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