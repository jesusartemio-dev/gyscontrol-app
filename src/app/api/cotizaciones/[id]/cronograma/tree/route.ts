// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/tree
// 🔧 Descripción: API unificada para vista jerárquica del cronograma de cotizaciones
// ✅ GET: Retornar jerarquía completa en formato árbol optimizado
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { contarDiasLaborables } from '@/lib/utils/calendarioLaboral'

export const dynamic = 'force-dynamic'

// Helper para normalizar fechas a mediodía UTC y evitar problemas de timezone
// Cuando el frontend hace new Date("2026-04-28"), JavaScript crea UTC midnight
// que en Peru (UTC-5) aparece como April 27 7pm. Usando mediodía UTC evitamos esto.
function toNoonUTC(date: Date | null | undefined): string | null {
  if (!date) return null
  const d = new Date(date)
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    12, 0, 0
  )).toISOString()
}

// ✅ GET /api/cotizaciones/[id]/cronograma/tree - Obtener jerarquía completa
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

    const expandedNodes = searchParams.get('expandedNodes')?.split(',') || []
    const includeProgress = searchParams.get('includeProgress') === 'true'
    const maxDepth = parseInt(searchParams.get('maxDepth') || '6')

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

    // Obtener fases con sus EDTs, actividades y tareas (5 niveles: Proyecto → Fases → EDTs → Actividades → Tareas)
    const fases = await prisma.cotizacionFase.findMany({
      where: { cotizacionId: id },
      include: {
        cotizacionEdt: {
          include: {
            cotizacionActividad: {
              include: {
                cotizacionTarea: true
              }
            }
          }
        }
      },
      orderBy: { orden: 'asc' }
    })

    console.log(`🌳 API Tree - Fases encontradas: ${fases.length}`)
    fases.forEach(fase => {
      console.log(`  - ${fase.nombre}: ${fase.cotizacionEdt.length} EDTs`)
      fase.cotizacionEdt.forEach(edt => {
        console.log(`    - ${edt.nombre}: ${edt.cotizacionActividad?.length || 0} actividades`)
        edt.cotizacionActividad?.forEach(actividad => {
          console.log(`      - ${actividad.nombre}: ${actividad.cotizacionTarea?.length || 0} tareas`)
        })
      })
    })

    // Obtener EDTs sin fase asignada (compatibilidad)
    const edtsSinFase = await prisma.cotizacionEdt.findMany({
      where: {
        cotizacionId: id,
        cotizacionFaseId: null
      },
      include: {
        cotizacionActividad: {
          include: {
            cotizacionTarea: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Calendario laboral real (no hay ConfiguracionCalendario a nivel cotización — usar el default activo)
    const calendarioLaboral = await prisma.calendarioLaboral.findFirst({
      where: { activo: true },
      orderBy: { createdAt: 'asc' },
      include: { diaCalendario: true, excepcionCalendario: true }
    })

    const duracionDiasReal = (fechaInicio: Date | string | null, fechaFin: Date | string | null): number => {
      if (!fechaInicio || !fechaFin || !calendarioLaboral) return 0
      return contarDiasLaborables(new Date(fechaInicio), new Date(fechaFin), calendarioLaboral)
    }

    // Construir árbol jerárquico con fases como raíz
    const tree: any[] = []

    // Función auxiliar para calcular progreso
    const calculateProgress = (items: any[], statusField = 'estado') => {
      if (!items || items.length === 0) return 0
      const completed = items.filter(item => item[statusField] === 'completada').length
      return Math.round((completed / items.length) * 100)
    }

    // Agregar fases como nodos raíz
   for (const fase of fases) {
     const faseNode = {
       id: `fase-${fase.id}`,
       type: 'fase',
       nombre: fase.nombre,
       level: 1,
       expanded: expandedNodes.includes(`fase-${fase.id}`),
       hasChildren: fase.cotizacionEdt?.length > 0,
       totalChildren: fase.cotizacionEdt?.length || 0,
       progressPercentage: calculateProgress(fase.cotizacionEdt || []),
       status: fase.estado || 'planificado',
       data: {
         descripcion: fase.descripcion,
         orden: fase.orden,
         fechaInicioPlan: toNoonUTC(fase.fechaInicioPlan),
         fechaFinPlan: toNoonUTC(fase.fechaFinPlan),
         horasEstimadas: fase.horasEstimadas,
         duracionDiasReal: duracionDiasReal(fase.fechaInicioPlan, fase.fechaFinPlan)
       },
       children: [] as any[]
     }

      // Agregar EDTs de esta fase
    for (const edt of fase.cotizacionEdt || []) {
      const edtNode = {
        id: `edt-${edt.id}`,
        type: 'edt',
        nombre: edt.nombre,
        level: 2,
        expanded: expandedNodes.includes(`edt-${edt.id}`),
        hasChildren: (edt.cotizacionActividad?.length || 0) > 0,
        totalChildren: (edt.cotizacionActividad?.length || 0),
        progressPercentage: calculateProgress(edt.cotizacionActividad || []),
        status: edt.estado || 'planificado',
        data: {
          descripcion: edt.descripcion,
          horasEstimadas: edt.horasEstimadas,
          prioridad: edt.prioridad,
          fechaInicioComercial: toNoonUTC(edt.fechaInicioComercial),
          fechaFinComercial: toNoonUTC(edt.fechaFinComercial),
          duracionDiasReal: duracionDiasReal(edt.fechaInicioComercial, edt.fechaFinComercial)
        },
        children: [] as any[]
      }

       // Agregar actividades directas del EDT (nivel 3)
        for (const actividad of edt.cotizacionActividad || []) {
           const actividadNode = {
             id: `actividad-${actividad.id}`,
             type: 'actividad',
             nombre: actividad.nombre,
             level: 3,
             expanded: expandedNodes.includes(`actividad-${actividad.id}`),
             hasChildren: actividad.cotizacionTarea?.length > 0,
             totalChildren: actividad.cotizacionTarea?.length || 0,
             progressPercentage: calculateProgress(actividad.cotizacionTarea || []),
             status: actividad.estado || 'pendiente',
             data: {
               descripcion: actividad.descripcion,
               prioridad: actividad.prioridad,
               fechaInicioComercial: toNoonUTC(actividad.fechaInicioComercial),
               fechaFinComercial: toNoonUTC(actividad.fechaFinComercial),
               horasEstimadas: actividad.horasEstimadas,
               duracionDiasReal: duracionDiasReal(actividad.fechaInicioComercial, actividad.fechaFinComercial)
             },
             children: actividad.cotizacionTarea?.map((tarea: any) => ({
               id: `tarea-${tarea.id}`,
               type: 'tarea',
               nombre: tarea.nombre,
               level: 4,
               expanded: false,
               hasChildren: false,
               totalChildren: 0,
               progressPercentage: tarea.estado === 'completada' ? 100 : 0,
               status: tarea.estado || 'pendiente',
               data: {
                 descripcion: tarea.descripcion,
                 fechaInicio: toNoonUTC(tarea.fechaInicio),
                 fechaFin: toNoonUTC(tarea.fechaFin),
                 horasEstimadas: tarea.horasEstimadas,
                 duracionDiasReal: duracionDiasReal(tarea.fechaInicio, tarea.fechaFin)
               },
               children: []
             })) || []
           }

           edtNode.children.push(actividadNode)
         }

        faseNode.children.push(edtNode)
      }

      tree.push(faseNode)
    }

    // Agregar EDTs sin fase asignada como nodos raíz separados
      for (const edt of edtsSinFase) {
        const edtNode = {
          id: `edt-${edt.id}`,
          type: 'edt',
          nombre: edt.nombre,
          level: 1,
          expanded: expandedNodes.includes(`edt-${edt.id}`),
          hasChildren: (edt.cotizacionActividad?.length || 0) > 0,
          totalChildren: (edt.cotizacionActividad?.length || 0),
          progressPercentage: calculateProgress(edt.cotizacionActividad || []),
          status: edt.estado || 'planificado',
          data: {
            descripcion: edt.descripcion,
            horasEstimadas: edt.horasEstimadas,
            prioridad: edt.prioridad,
            fechaInicioComercial: toNoonUTC(edt.fechaInicioComercial),
            fechaFinComercial: toNoonUTC(edt.fechaFinComercial),
            duracionDiasReal: duracionDiasReal(edt.fechaInicioComercial, edt.fechaFinComercial)
          },
          children: [] as any[]
        }

        // Agregar actividades directas del EDT (nivel 2)
        for (const actividad of edt.cotizacionActividad || []) {
         const actividadNode = {
           id: `actividad-${actividad.id}`,
           type: 'actividad',
           nombre: actividad.nombre,
           level: 2,
           expanded: expandedNodes.includes(`actividad-${actividad.id}`),
           hasChildren: actividad.cotizacionTarea?.length > 0,
           totalChildren: actividad.cotizacionTarea?.length || 0,
           progressPercentage: calculateProgress(actividad.cotizacionTarea || []),
           status: actividad.estado || 'pendiente',
           data: {
             descripcion: actividad.descripcion,
             prioridad: actividad.prioridad,
             fechaInicioComercial: toNoonUTC(actividad.fechaInicioComercial),
             fechaFinComercial: toNoonUTC(actividad.fechaFinComercial),
             horasEstimadas: actividad.horasEstimadas,
             duracionDiasReal: duracionDiasReal(actividad.fechaInicioComercial, actividad.fechaFinComercial)
           },
           children: actividad.cotizacionTarea?.map((tarea: any) => ({
             id: `tarea-${tarea.id}`,
             type: 'tarea',
             nombre: tarea.nombre,
             level: 3,
             expanded: false,
             hasChildren: false,
             totalChildren: 0,
             progressPercentage: tarea.estado === 'completada' ? 100 : 0,
             status: tarea.estado || 'pendiente',
             data: {
               descripcion: tarea.descripcion,
               fechaInicio: toNoonUTC(tarea.fechaInicio),
               fechaFin: toNoonUTC(tarea.fechaFin),
               horasEstimadas: tarea.horasEstimadas,
               duracionDiasReal: duracionDiasReal(tarea.fechaInicio, tarea.fechaFin)
             },
             children: []
           })) || []
         }

         edtNode.children.push(actividadNode)
       }

       tree.push(edtNode)
     }


    console.log('✅ [API TREE] Árbol construido exitosamente - COTIZACIONES')
    console.log('🔍 [API TREE] Árbol final COTIZACIONES:', tree.map((fase: any) => ({
      id: fase.id,
      nombre: fase.nombre,
      level: fase.level,
      childrenCount: fase.children.length,
      children: fase.children.map((edt: any) => ({
        id: edt.id,
        nombre: edt.nombre,
        level: edt.level,
        childrenCount: edt.children.length,
        children: edt.children.map((act: any) => ({
          id: act.id,
          nombre: act.nombre,
          level: act.level,
          childrenCount: act.children.length,
          children: act.children.map((tarea: any) => ({
            id: tarea.id,
            nombre: tarea.nombre,
            level: tarea.level
          }))
        }))
      }))
    })))

    return NextResponse.json({
      success: true,
      data: {
        tree,
        metadata: {
          totalNodes: tree.reduce((sum, node) => sum + 1 + node.totalChildren, 0),
          maxDepth: 4, // ✅ 4 niveles visibles (fase-edt-actividad-tarea)
          lastUpdated: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error('❌ Error obteniendo árbol del cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
