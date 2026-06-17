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
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { fechasEdtDefault } from '@/lib/services/cronogramaFechasDefault'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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
    logger.error('❌ [API IMPORT EDTS] Error al obtener EDTs para importar:', error)
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
    const { edts, edtIds, faseId } = body

    // Soporte para formato nuevo { edts: [{edtId, nombre}] } y legacy { edtIds: string[] }
    const selections: { edtId: string; nombre?: string }[] = edts && Array.isArray(edts)
      ? edts
      : edtIds && Array.isArray(edtIds)
        ? edtIds.map((id: string) => ({ edtId: id }))
        : []

    if (selections.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un EDT para importar' },
        { status: 400 }
      )
    }

    const edtIds_resolved = selections.map(s => s.edtId)

    // ✅ Validar que el proyecto existe (fechaInicio = Vigencia, para fechas por defecto)
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true, fechaInicio: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Resolver el cronograma destino a partir de la fase donde se importa.
    // Cada cronograma (planificación, ejecución) tiene sus propias fases, así que
    // debemos importar al cronograma DUEÑO de la fase destino — no al baseline de
    // planificación (que suele estar bloqueado y haría fallar la importación en ejecución).
    let cronograma: { id: string } | null = null

    const faseLimpia = faseId ? faseId.replace('fase-', '') : null
    if (faseLimpia) {
      const faseDestino = await prisma.proyectoFase.findUnique({
        where: { id: faseLimpia },
        select: { proyectoCronogramaId: true }
      })
      if (faseDestino?.proyectoCronogramaId) {
        cronograma = await prisma.proyectoCronograma.findUnique({
          where: { id: faseDestino.proyectoCronogramaId },
          select: { id: true }
        })
      }
    }

    // Fallback (sin fase): planificación baseline, o cualquier cronograma activo
    if (!cronograma) {
      cronograma = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId, tipo: 'planificacion', esBaseline: true },
        select: { id: true }
      }) || await prisma.proyectoCronograma.findFirst({
        where: { proyectoId },
        select: { id: true }
      })
    }

    if (!cronograma) {
      return NextResponse.json(
        { error: 'No se encontró un cronograma válido para el proyecto' },
        { status: 404 }
      )
    }

    // ✅ Validar permisos: solo admin/gerente/gestor/coordinador y NO en cronograma comercial
    const permiso = await validarPermisoCronograma(cronograma.id)
    if (!permiso.ok) return permiso.response

    console.log('✅ Cronograma encontrado:', cronograma.id)

    // ✅ Obtener los EDTs del catálogo para importar
    const edtsCatalogo = await prisma.edt.findMany({
      where: { id: { in: edtIds_resolved } },
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

        // Usar nombre personalizado si fue provisto, o el nombre del catálogo
        const seleccion = selections.find(s => s.edtId === edtCatalogo.id)
        const nombreFinal = seleccion?.nombre?.trim() || edtCatalogo.nombre

        // ✅ Fechas por defecto: inicio tras el último EDT hermano (o inicio de la fase / vigencia).
        // Como cada EDT creado queda persistido, los siguientes se escalonan secuencialmente.
        const faseDestino = proyectoFaseId
          ? await prisma.proyectoFase.findUnique({
              where: { id: proyectoFaseId },
              select: { fechaInicioPlan: true }
            })
          : null
        const fechasDef = await fechasEdtDefault(
          proyectoFaseId,
          faseDestino?.fechaInicioPlan ?? null,
          proyecto.fechaInicio
        )

        // Crear el EDT en el proyecto
        const edtProyecto = await prisma.proyectoEdt.create({
          data: {
            id: crypto.randomUUID(),
            proyectoId,
            proyectoCronogramaId: cronograma.id,
            proyectoFaseId,
            nombre: nombreFinal,
            descripcion: edtCatalogo.descripcion,
            edtId: edtCatalogo.id,
            fechaInicioPlan: fechasDef.fechaInicioPlan,
            fechaFinPlan: fechasDef.fechaFinPlan,
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
        logger.error(`❌ Error importando EDT ${edtCatalogo.nombre}:`, error)
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
        logger.error('❌ Error en preparación para actualizar horas en fase:', updateError)
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
        totalSolicitados: edtIds_resolved.length,
        totalExitosos: resultados.length,
        totalErrores: errores.length
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('❌ [API IMPORT EDTS] Error en importación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}