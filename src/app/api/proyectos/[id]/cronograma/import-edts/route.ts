// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/import-edts/route.ts
// 🔧 Descripción: API para obtener EDTs disponibles para importar en fases
// 🎯 Funcionalidades: Lista EDTs del catálogo con información de fase por defecto
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-30
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ✅ GET /api/proyectos/[id]/cronograma/import-edts - Obtener EDTs disponibles para importar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params
    const { searchParams } = new URL(request.url)
    const faseId = searchParams.get('faseId') // Opcional: filtrar por fase específica

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      console.log('❌ [API IMPORT EDTS] Proyecto no encontrado')
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener EDTs del catálogo con información de fase por defecto
    const edtsCatalogo = await prisma.edt.findMany({
      include: {
        faseDefault: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            orden: true
          }
        },
        catalogoServicio: {
          select: {
            id: true,
            nombre: true,
            descripcion: true
          }
        }
      },
      orderBy: [
        { faseDefault: { orden: 'asc' } },
        { nombre: 'asc' }
      ]
    })

    // ✅ Obtener EDTs ya existentes en el proyecto para excluirlos
    const edtsProyecto = await prisma.proyectoEdt.findMany({
      where: { proyectoId },
      select: {
        edtId: true, // Este es el ID del EDT del catálogo
        nombre: true
      }
    })

    const edtsExistentesIds = new Set(edtsProyecto.map(edt => edt.edtId))

    // ✅ Filtrar EDTs disponibles (que no estén ya en el proyecto)
    let edtsDisponibles = edtsCatalogo.filter(edt => !edtsExistentesIds.has(edt.id))

    // ✅ Si se especifica una fase, filtrar por EDTs que tengan esa fase por defecto
    if (faseId) {
      // El faseId viene como "fase-{id}", necesitamos extraer solo el ID
      const faseProyectoId = faseId.replace('fase-', '')

      // Obtener el nombre de la fase del proyecto
      const faseProyecto = await prisma.proyectoFase.findUnique({
        where: { id: faseProyectoId },
        select: { nombre: true }
      })

      if (!faseProyecto) {
        edtsDisponibles = []
      } else {
        // Filtrar por nombre de fase en lugar de ID
        edtsDisponibles = edtsDisponibles.filter(edt => {
          return edt.faseDefault?.nombre === faseProyecto.nombre
        })
      }
    }

    // ✅ Formatear respuesta
    const edtsFormateados = edtsDisponibles.map(edt => ({
      id: edt.id,
      nombre: edt.nombre,
      descripcion: edt.descripcion,
      faseDefault: edt.faseDefault,
      serviciosCount: edt.catalogoServicio.length,
      servicios: edt.catalogoServicio,
      // Información adicional para el modal de importación
      metadata: {
        tieneFaseDefault: !!edt.faseDefault,
        serviciosDisponibles: edt.catalogoServicio.length
      }
    }))

    return NextResponse.json({
      success: true,
      data: edtsFormateados,
      metadata: {
        totalDisponibles: edtsFormateados.length,
        totalEnCatalogo: edtsCatalogo.length,
        totalEnProyecto: edtsExistentesIds.size,
        faseFiltrada: faseId || null
      }
    })

  } catch (error) {
    console.error('❌ [API IMPORT EDTS] Error al obtener EDTs para importar:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/import-edts - Importar EDTs seleccionados
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params
    const body = await request.json()
    const { edtIds, faseId } = body

    if (!edtIds || !Array.isArray(edtIds) || edtIds.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un EDT para importar' },
        { status: 400 }
      )
    }

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener el cronograma del proyecto (preferiblemente el de planificación baseline)
    let cronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId,
        tipo: 'planificacion',
        esBaseline: true
      }
    })

    if (!cronograma) {
      // Fallback: obtener cualquier cronograma activo
      cronograma = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId }
      })
    }

    if (!cronograma) {
      return NextResponse.json(
        { error: 'No se encontró un cronograma válido para el proyecto' },
        { status: 404 }
      )
    }

    console.log('✅ Cronograma encontrado:', cronograma.id)

    // ✅ Obtener los EDTs del catálogo para importar
    const edtsCatalogo = await prisma.edt.findMany({
      where: { id: { in: edtIds } },
      include: {
        faseDefault: true,
        catalogoServicio: true
      }
    })

    console.log('EDTs del catálogo a importar:', edtsCatalogo.length)

    const resultados = []
    const errores = []

    // ✅ Importar cada EDT
    for (const edtCatalogo of edtsCatalogo) {
      try {
        // Determinar la fase del proyecto donde importar
        let proyectoFaseId = faseId ? faseId.replace('fase-', '') : undefined

        if (!proyectoFaseId && edtCatalogo.faseDefaultId && edtCatalogo.faseDefault) {
          // Buscar fase correspondiente en el proyecto por nombre
          const faseProyecto = await prisma.proyectoFase.findFirst({
            where: {
              proyectoId,
              nombre: edtCatalogo.faseDefault.nombre
            }
          })
          proyectoFaseId = faseProyecto?.id
        }

        // Crear el EDT en el proyecto
        const edtProyecto = await prisma.proyectoEdt.create({
          data: {
            id: crypto.randomUUID(),
            proyectoId,
            proyectoCronogramaId: cronograma.id,
            proyectoFaseId,
            nombre: edtCatalogo.nombre,
            descripcion: edtCatalogo.descripcion,
            edtId: edtCatalogo.id,
            estado: 'planificado',
            porcentajeAvance: 0,
            horasPlan: 0, // Se calculará después basado en servicios
            prioridad: 'media',
            updatedAt: new Date()
          },
          include: {
            proyectoFase: {
              select: { id: true, nombre: true }
            }
          }
        })

        // ✅ NO importar servicios automáticamente - solo crear EDT básico

        resultados.push({
          id: edtProyecto.id,
          nombre: edtProyecto.nombre,
          fase: edtProyecto.proyectoFase?.nombre || 'Sin fase asignada',
          serviciosImportados: 0 // Ya no se importan servicios automáticamente
        })

      } catch (error) {
        console.error(`❌ Error importando EDT ${edtCatalogo.nombre}:`, error)
        errores.push(`Error importando EDT ${edtCatalogo.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    console.log('Importación completada:', {
      exitosos: resultados.length,
      errores: errores.length
    })

    // ✅ Actualizar horas en la fase padre
    if (resultados.length > 0 && faseId) {
      try {
        const cleanFaseId = faseId.replace('fase-', '')

        // Calcular total de horas de los EDTs recién creados
        const totalHorasEdts = resultados.reduce((total, item) => {
          // Los EDTs se crean con horasPlan: 0 inicialmente
          // Las horas se calcularán cuando se importen actividades/tareas
          return total + 0
        }, 0)

        // Por ahora no sumamos horas ya que los EDTs se crean vacíos
        // Las horas se actualizarán cuando se importen actividades y tareas

        console.log('ℹ️ EDTs importados sin horas iniciales (se calcularán con actividades/tareas)')

      } catch (updateError) {
        console.error('❌ Error en preparación para actualizar horas en fase:', updateError)
        // No fallar la importación por error en preparación
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        importados: resultados,
        errores
      },
      metadata: {
        totalSolicitados: edtIds.length,
        totalExitosos: resultados.length,
        totalErrores: errores.length
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ [API IMPORT EDTS] Error en importación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}