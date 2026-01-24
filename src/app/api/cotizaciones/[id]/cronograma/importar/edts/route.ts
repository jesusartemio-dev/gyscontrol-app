// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/importar/edts
// 🔧 Descripción: Importar EDTs desde EDTs de servicios a fases
// ✅ POST: Importar EDTs seleccionados a una fase específica
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importEdtsSchema = z.object({
  faseId: z.string().min(1, 'La fase es requerida'),
  edtIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un EDT')
})

// ✅ POST /api/cotizaciones/[id]/cronograma/importar/edts
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
      include: { user: true }
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
    const validatedData = importEdtsSchema.parse(body)

    // Verificar que la fase existe y pertenece a la cotización
    const fase = await prisma.cotizacionFase.findFirst({
      where: {
        id: validatedData.faseId,
        cotizacionId: id
      }
    })

    if (!fase) {
      return NextResponse.json({
        error: 'Fase no encontrada o no pertenece a esta cotización'
      }, { status: 400 })
    }

    // Obtener servicios de la cotización agrupados por edtId
    const servicios = await prisma.cotizacionServicio.findMany({
      where: { cotizacionId: id },
      include: {
        cotizacionServicioItem: true,
        edt: true
      }
    })

    // Filtrar EDTs seleccionados que tienen servicios
    const edtsDisponibles = new Map()
    servicios.forEach(servicio => {
      if (servicio.edtId && validatedData.edtIds.includes(servicio.edtId)) {
        if (!edtsDisponibles.has(servicio.edtId)) {
          edtsDisponibles.set(servicio.edtId, {
            edtId: servicio.edtId,
            nombre: servicio.edt?.nombre || servicio.edtId,
            servicios: [],
            totalHoras: 0
          })
        }
        const edtData = edtsDisponibles.get(servicio.edtId)
        edtData.servicios.push(servicio)
        edtData.totalHoras += servicio.cotizacionServicioItem.reduce((sum: number, item: any) => sum + (Number(item.horaTotal) || 0), 0)
      }
    })

    if (edtsDisponibles.size === 0) {
      return NextResponse.json({
        error: 'Ninguno de los EDTs seleccionados tiene servicios en esta cotización'
      }, { status: 400 })
    }

    // Verificar que no existan EDTs con nombres duplicados en esta fase
    const edtsExistentes = await prisma.cotizacionEdt.findMany({
      where: {
        cotizacionId: id,
        cotizacionFaseId: validatedData.faseId
      },
      select: { nombre: true }
    })

    const nombresExistentes = edtsExistentes.map(edt => edt.nombre)

    // Crear EDTs para los seleccionados
    const edtsCreados = []
    for (const [edtId, edtData] of edtsDisponibles) {
      // Verificar que no exista ya un EDT con este nombre en la fase
      if (nombresExistentes.includes(edtData.nombre)) {
        continue // Saltar este EDT
      }

      const nuevoEdt = await prisma.cotizacionEdt.create({
        data: {
          id: `cot-edt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          cotizacionId: id,
          cotizacionFaseId: validatedData.faseId,
          cotizacionServicioId: edtData.servicios[0]?.id, // Link to first service
          edtId: edtId,
          nombre: edtData.nombre,
          descripcion: `EDT importado para ${edtData.nombre}`,
          horasEstimadas: edtData.totalHoras,
          estado: 'planificado',
          prioridad: 'media',
          updatedAt: new Date()
        }
      })

      edtsCreados.push({
        ...nuevoEdt,
        serviciosCount: edtData.servicios.length,
        totalHoras: edtData.totalHoras
      })
    }

    return NextResponse.json({
      success: true,
      data: edtsCreados,
      message: `Se importaron ${edtsCreados.length} EDTs exitosamente`,
      skipped: edtsDisponibles.size - edtsCreados.length
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error importando EDTs:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ GET /api/cotizaciones/[id]/cronograma/importar/edts - Obtener EDTs disponibles para importar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const faseId = searchParams.get('faseId')

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { user: true }
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

    // Obtener servicios agrupados por edtId
    const servicios = await prisma.cotizacionServicio.findMany({
      where: { cotizacionId: id },
      include: {
        cotizacionServicioItem: true,
        edt: true
      }
    })

    // Agrupar por edtId
    const edtsMap = new Map()
    servicios.forEach(servicio => {
      const edtId = servicio.edtId
      if (!edtId) return

      if (!edtsMap.has(edtId)) {
        edtsMap.set(edtId, {
          id: edtId,
          nombre: servicio.edt?.nombre || edtId,
          descripcion: servicio.edt?.descripcion || 'Sin descripción',
          servicios: [],
          totalHoras: 0
        })
      }
      const edtData = edtsMap.get(edtId)
      edtData.servicios.push(servicio)
      edtData.totalHoras += servicio.cotizacionServicioItem.reduce((sum: number, item: any) => sum + (Number(item.horaTotal) || 0), 0)
    })

    // Convertir a array y filtrar EDTs que ya existen en la fase (si se especifica)
    let edts = Array.from(edtsMap.values())

    if (faseId) {
      // Obtener EDTs existentes en esta fase
      const edtsExistentes = await prisma.cotizacionEdt.findMany({
        where: {
          cotizacionId: id,
          cotizacionFaseId: faseId
        },
        select: { nombre: true }
      })

      const nombresEdtsExistentes = edtsExistentes.map(edt => edt.nombre)

      // Filtrar EDTs que no tienen uno ya creado
      edts = edts.filter(edt => !nombresEdtsExistentes.includes(edt.nombre))
    }

    return NextResponse.json({
      success: true,
      data: edts
    })

  } catch (error) {
    console.error('❌ Error obteniendo EDTs disponibles:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
