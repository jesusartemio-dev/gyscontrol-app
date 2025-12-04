// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/importar/actividades
// 🔧 Descripción: Importar actividades desde servicios a EDTs o zonas
// ✅ POST: Importar actividades seleccionadas
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importActividadesSchema = z.object({
  parentType: z.enum(['edt', 'zona'], {
    errorMap: () => ({ message: 'El tipo de padre debe ser "edt" o "zona"' })
  }),
  parentId: z.string().min(1, 'El ID del padre es requerido'),
  servicioIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un servicio')
})

// ✅ POST /api/cotizaciones/[id]/cronograma/importar/actividades
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { comercial: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para modificar el cronograma' }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = importActividadesSchema.parse(body)

    // Verificar que el padre existe y pertenece a la cotización
    let parentData
    if (validatedData.parentType === 'edt') {
      parentData = await prisma.cotizacionEdt.findFirst({
        where: {
          id: validatedData.parentId,
          cotizacionId: id
        }
      })
      if (!parentData) {
        return NextResponse.json({
          error: 'EDT no encontrado o no pertenece a esta cotización'
        }, { status: 400 })
      }
    } else {
      parentData = await prisma.cotizacionZona.findFirst({
        where: {
          id: validatedData.parentId,
          cotizacionId: id
        }
      })
      if (!parentData) {
        return NextResponse.json({
          error: 'Zona no encontrada o no pertenece a esta cotización'
        }, { status: 400 })
      }
    }

    // Obtener servicios seleccionados que pertenecen a la cotización
    const servicios = await prisma.cotizacionServicio.findMany({
      where: {
        id: { in: validatedData.servicioIds },
        cotizacionId: id
      },
      include: {
        items: true
      }
    })

    if (servicios.length === 0) {
      return NextResponse.json({
        error: 'Ninguno de los servicios seleccionados pertenece a esta cotización'
      }, { status: 400 })
    }

    // Verificar que no existan actividades con nombres duplicados
    const actividadesExistentes = await prisma.cotizacionActividad.findMany({
      where: validatedData.parentType === 'edt'
        ? { cotizacionEdtId: validatedData.parentId }
        : { cotizacionZonaId: validatedData.parentId },
      select: { nombre: true }
    })

    const nombresExistentes = actividadesExistentes.map(act => act.nombre)

    // Crear actividades para los servicios seleccionados
    const actividadesCreadas = []
    for (const servicio of servicios) {
      // Verificar que no exista ya una actividad con este nombre
      if (nombresExistentes.includes(servicio.nombre)) {
        continue // Saltar este servicio
      }

      const horasServicio = servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)

      const nuevaActividad = await prisma.cotizacionActividad.create({
        data: {
          ...(validatedData.parentType === 'edt'
            ? { cotizacionEdtId: validatedData.parentId }
            : { cotizacionZonaId: validatedData.parentId }
          ),
          nombre: servicio.nombre,
          descripcion: `Actividad importada desde servicio ${servicio.nombre}`,
          horasEstimadas: horasServicio,
          estado: 'pendiente',
          prioridad: 'media'
        }
      })

      actividadesCreadas.push({
        ...nuevaActividad,
        servicioId: servicio.id,
        totalItems: servicio.items.length,
        totalHoras: horasServicio
      })
    }

    return NextResponse.json({
      success: true,
      data: actividadesCreadas,
      message: `Se importaron ${actividadesCreadas.length} actividades exitosamente`,
      skipped: servicios.length - actividadesCreadas.length
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error importando actividades:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ GET /api/cotizaciones/[id]/cronograma/importar/actividades - Obtener servicios disponibles para importar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const parentType = searchParams.get('parentType') as 'edt' | 'zona'
    const parentId = searchParams.get('parentId')

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { comercial: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver el cronograma' }, { status: 403 })
    }

    if (!parentType || !parentId || !['edt', 'zona'].includes(parentType)) {
      return NextResponse.json({
        error: 'Parámetros parentType y parentId son requeridos. parentType debe ser "edt" o "zona"'
      }, { status: 400 })
    }

    // Verificar que el padre existe
    if (parentType === 'edt') {
      const edt = await prisma.cotizacionEdt.findFirst({
        where: { id: parentId, cotizacionId: id }
      })
      if (!edt) {
        return NextResponse.json({ error: 'EDT no encontrado' }, { status: 404 })
      }
    } else {
      const zona = await prisma.cotizacionZona.findFirst({
        where: { id: parentId, cotizacionId: id }
      })
      if (!zona) {
        return NextResponse.json({ error: 'Zona no encontrada' }, { status: 404 })
      }
    }

    // Obtener todos los servicios de la cotización
    const servicios = await prisma.cotizacionServicio.findMany({
      where: { cotizacionId: id },
      include: {
        items: true
      }
    })

    // Obtener actividades existentes en el padre para filtrar duplicados
    const actividadesExistentes = await prisma.cotizacionActividad.findMany({
      where: parentType === 'edt'
        ? { cotizacionEdtId: parentId }
        : { cotizacionZonaId: parentId },
      select: { nombre: true }
    })

    const nombresActividadesExistentes = actividadesExistentes.map(act => act.nombre)

    // Filtrar servicios que no tienen actividad ya creada
    const serviciosDisponibles = servicios
      .filter(servicio => !nombresActividadesExistentes.includes(servicio.nombre))
      .map(servicio => ({
        id: servicio.id,
        nombre: servicio.nombre,
        categoria: servicio.categoria,
        totalItems: servicio.items.length,
        totalHoras: servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
      }))

    return NextResponse.json({
      success: true,
      data: serviciosDisponibles
    })

  } catch (error) {
    console.error('❌ Error obteniendo servicios disponibles:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}