// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/importar/edts
// 🔧 Descripción: Importar EDTs desde categorías de servicios a fases
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
  categoriaIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una categoría')
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

    // Obtener servicios de la cotización agrupados por categoría
    const servicios = await prisma.cotizacionServicio.findMany({
      where: { cotizacionId: id },
      include: {
        items: true
      }
    })

    // Filtrar categorías seleccionadas que tienen servicios
    const categoriasDisponibles = new Map()
    servicios.forEach(servicio => {
      if (validatedData.categoriaIds.includes(servicio.categoria)) {
        if (!categoriasDisponibles.has(servicio.categoria)) {
          categoriasDisponibles.set(servicio.categoria, {
            categoria: servicio.categoria,
            servicios: [],
            totalHoras: 0
          })
        }
        const categoriaData = categoriasDisponibles.get(servicio.categoria)
        categoriaData.servicios.push(servicio)
        categoriaData.totalHoras += servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
      }
    })

    if (categoriasDisponibles.size === 0) {
      return NextResponse.json({
        error: 'Ninguna de las categorías seleccionadas tiene servicios en esta cotización'
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

    // Crear EDTs para las categorías seleccionadas
    const edtsCreados = []
    for (const [categoriaNombre, categoriaData] of categoriasDisponibles) {
      // Verificar que no exista ya un EDT con este nombre en la fase
      if (nombresExistentes.includes(categoriaNombre)) {
        continue // Saltar esta categoría
      }

      const nuevoEdt = await prisma.cotizacionEdt.create({
        data: {
          cotizacionId: id,
          cotizacionFaseId: validatedData.faseId,
          cotizacionServicioId: categoriaData.servicios[0]?.id, // Link to first service in category
          nombre: categoriaNombre,
          descripcion: `EDT importado manualmente para categoría ${categoriaNombre}`,
          horasEstimadas: categoriaData.totalHoras,
          estado: 'planificado',
          prioridad: 'media'
        }
      })

      edtsCreados.push({
        ...nuevoEdt,
        serviciosCount: categoriaData.servicios.length,
        totalHoras: categoriaData.totalHoras
      })
    }

    return NextResponse.json({
      success: true,
      data: edtsCreados,
      message: `Se importaron ${edtsCreados.length} EDTs exitosamente`,
      skipped: categoriasDisponibles.size - edtsCreados.length
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

// ✅ GET /api/cotizaciones/[id]/cronograma/importar/edts - Obtener categorías disponibles para importar
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

    // Obtener servicios agrupados por categoría
    const servicios = await prisma.cotizacionServicio.findMany({
      where: { cotizacionId: id },
      include: {
        items: true
      }
    })

    // Obtener información de categorías reales
    const categoriasTabla = await prisma.categoriaServicio.findMany()
    const categoriaMap = new Map(categoriasTabla.map(cat => [cat.id, cat]))

    // Agrupar por categoría
    const categoriasMap = new Map()
    servicios.forEach(servicio => {
      const categoriaId = servicio.categoria
      if (!categoriasMap.has(categoriaId)) {
        const categoriaInfo = categoriaMap.get(categoriaId)
        categoriasMap.set(categoriaId, {
          id: categoriaId,
          nombre: categoriaInfo?.nombre || categoriaId,
          descripcion: categoriaInfo?.descripcion || 'Sin descripción',
          servicios: [],
          totalHoras: 0
        })
      }
      const categoriaData = categoriasMap.get(categoriaId)
      categoriaData.servicios.push(servicio)
      categoriaData.totalHoras += servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
    })

    // Convertir a array y filtrar categorías que ya tienen EDTs en la fase (si se especifica)
    let categorias = Array.from(categoriasMap.values())

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

      // Filtrar categorías que no tienen EDT ya creado
      categorias = categorias.filter(cat => !nombresEdtsExistentes.includes(cat.nombre))
    }

    return NextResponse.json({
      success: true,
      data: categorias
    })

  } catch (error) {
    console.error('❌ Error obteniendo categorías disponibles:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}