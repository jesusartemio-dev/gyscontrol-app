// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/importar/fases
// 🔧 Descripción: Importar fases desde configuración a cronograma
// ✅ POST: Importar fases seleccionadas al cronograma
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importFasesSchema = z.object({
  faseIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una fase')
})

// ✅ POST /api/cotizaciones/[id]/cronograma/importar/fases
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('📥 POST /api/cotizaciones/[id]/cronograma/importar/fases - ID:', id)

    const session = await getServerSession(authOptions)
    console.log('👤 Session:', session ? 'OK' : 'NULL')

    if (!session) {
      console.log('❌ No autorizado')
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
    console.log('📋 Request body:', body)
    const validatedData = importFasesSchema.parse(body)
    console.log('✅ Validated data:', validatedData)

    console.log('🌐 Obteniendo fases de configuración desde BD...')
    const fasesConfig = await prisma.faseDefault.findMany({
      orderBy: { orden: 'asc' }
    })
    console.log('📊 Fases de configuración obtenidas:', fasesConfig.length)

    if (fasesConfig.length === 0) {
      return NextResponse.json({
        error: 'No hay fases configuradas en el sistema. Ve a Configuración > Fases por Defecto para crearlas.'
      }, { status: 400 })
    }

    // Filtrar fases seleccionadas
    const fasesAImportar = fasesConfig.filter((fase: any) => validatedData.faseIds.includes(fase.id))

    console.log('🔍 Obteniendo fases existentes...')
    let fasesExistentes: any[] = []
    try {
      // Obtener fases existentes para permitir actualizaciones
      fasesExistentes = await prisma.cotizacionFase.findMany({
        where: { cotizacionId: id },
        select: { id: true, nombre: true, descripcion: true, orden: true }
      })
      console.log('📊 Fases existentes encontradas:', fasesExistentes.length)

    } catch (dbError) {
      console.error('❌ Error al obtener fases existentes:', dbError)
      throw new Error('Error al acceder a la base de datos')
    }

    const nombresExistentes = fasesExistentes.map((f: any) => f.nombre)
    console.log('🏷️ Nombres existentes:', nombresExistentes)

    const fasesNuevas = fasesAImportar.filter((fase: any) => !nombresExistentes.includes(fase.nombre))
    const fasesAActualizar = fasesAImportar.filter((fase: any) => nombresExistentes.includes(fase.nombre))

    console.log('🆕 Fases nuevas a crear:', fasesNuevas.length)
    console.log('🔄 Fases a actualizar:', fasesAActualizar.length)

    if (fasesNuevas.length === 0 && fasesAActualizar.length === 0) {
      return NextResponse.json({
        error: 'Todas las fases seleccionadas ya existen en el cronograma y no requieren actualización'
      }, { status: 400 })
    }

    console.log('🏗️ Iniciando procesamiento de fases...')

    // Crear fases nuevas y actualizar existentes
    const fasesCreadas = []
    const fasesActualizadas = []

    console.log('🆕 Creando fases nuevas...')
    // Crear fases nuevas
    for (const faseConfig of fasesNuevas) {
      console.log('➕ Creando fase:', faseConfig.nombre)
      const nuevaFase = await prisma.cotizacionFase.create({
        data: {
          cotizacionId: id,
          nombre: faseConfig.nombre,
          descripcion: faseConfig.descripcion,
          orden: faseConfig.orden,
          estado: 'planificado'
        }
      })
      console.log('✅ Fase creada:', nuevaFase.id)
      fasesCreadas.push(nuevaFase)
    }
    console.log('🆕 Fases nuevas creadas:', fasesCreadas.length)

    console.log('🔄 Actualizando fases existentes...')
    // Actualizar fases existentes
    for (const faseConfig of fasesAActualizar) {
      console.log('🔄 Actualizando fase:', faseConfig.nombre)
      const faseExistente = fasesExistentes.find((f: any) => f.nombre === faseConfig.nombre)
      if (faseExistente) {
        const faseActualizada = await prisma.cotizacionFase.update({
          where: { id: faseExistente.id },
          data: {
            descripcion: faseConfig.descripcion,
            orden: faseConfig.orden
          }
        })
        console.log('✅ Fase actualizada:', faseActualizada.id)
        fasesActualizadas.push(faseActualizada)
      } else {
        console.log('⚠️ Fase no encontrada para actualizar:', faseConfig.nombre)
      }
    }
    console.log('🔄 Fases existentes actualizadas:', fasesActualizadas.length)

    const totalProcesadas = fasesCreadas.length + fasesActualizadas.length

    console.log('✅ Import completed successfully')
    console.log('📊 Summary:', {
      totalProcesadas,
      creadas: fasesCreadas.length,
      actualizadas: fasesActualizadas.length
    })

    return NextResponse.json({
      success: true,
      data: [...fasesCreadas, ...fasesActualizadas],
      message: `Se procesaron ${totalProcesadas} fases exitosamente (${fasesCreadas.length} creadas, ${fasesActualizadas.length} actualizadas)`,
      created: fasesCreadas.length,
      updated: fasesActualizadas.length
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error importando fases:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}