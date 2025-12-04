// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/tree/[nodeId]/children
// 🔧 Descripción: Cargar hijos de un nodo específico (lazy loading)
// ✅ GET: Obtener hijos directos de un nodo
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/cotizaciones/[id]/cronograma/tree/[nodeId]/children
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id, nodeId } = await params
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
      return NextResponse.json({ error: 'No tiene permisos para ver el cronograma' }, { status: 403 })
    }

    // Extraer tipo y ID real del nodeId (formato: "tipo-id")
    const [nodeType, realId] = nodeId.split('-', 2)

    if (!nodeType || !realId) {
      return NextResponse.json({ error: 'Formato de nodeId inválido' }, { status: 400 })
    }

    let children: any[] = []

    // Obtener hijos según el tipo de nodo padre
    switch (nodeType) {
      case 'fase':
        // EDTs de esta fase
        const edts = await prisma.cotizacionEdt.findMany({
          where: { cotizacionId: id, cotizacionFaseId: realId },
          orderBy: { createdAt: 'asc' }
        })

        // Contar actividades por EDT
        const actividadesPorEdt = await Promise.all(
          edts.map(async (edt) => {
            const count = await prisma.cotizacionActividad.count({
              where: { cotizacionEdtId: edt.id }
            })
            return { edtId: edt.id, count }
          })
        )

        const actividadesMap = new Map(actividadesPorEdt.map(item => [item.edtId, item.count]))

        children = edts.map(edt => {
          const actividadesCount = actividadesMap.get(edt.id) || 0
          return {
            id: `edt-${edt.id}`,
            type: 'edt',
            nombre: edt.nombre,
            level: 2,
            expanded: false,
            hasChildren: actividadesCount > 0,
            totalChildren: actividadesCount,
            progressPercentage: 0,
            status: edt.estado,
            data: {
              categoriaServicio: edt.nombre,
              horasEstimadas: edt.horasEstimadas
            },
            metadata: {
              hasChildren: actividadesCount > 0,
              totalChildren: actividadesCount,
              progressPercentage: 0,
              status: edt.estado
            },
            children: []
          }
        })
        break

      case 'edt':
        // Actividades directas del EDT (sin zonas intermedias)
        const actividades = await prisma.cotizacionActividad.findMany({
          where: { cotizacionEdtId: realId },
          orderBy: { createdAt: 'asc' }
        })

        // Contar tareas por actividad
        const tareasPorActividad = await Promise.all(
          actividades.map(async (actividad) => {
            const count = await prisma.cotizacionTarea.count({
              where: { cotizacionActividadId: actividad.id }
            })
            return { actividadId: actividad.id, count }
          })
        )

        const tareasMap = new Map(tareasPorActividad.map(item => [item.actividadId, item.count]))

        children = actividades.map(actividad => {
          const tareasCount = tareasMap.get(actividad.id) || 0
          return {
            id: `actividad-${actividad.id}`,
            type: 'actividad',
            nombre: actividad.nombre,
            level: 3,
            expanded: false,
            hasChildren: tareasCount > 0,
            totalChildren: tareasCount,
            progressPercentage: actividad.porcentajeAvance || 0,
            status: actividad.estado,
            data: {
              fechaInicio: actividad.fechaInicioComercial?.toISOString().split('T')[0],
              fechaFin: actividad.fechaFinComercial?.toISOString().split('T')[0],
              horasEstimadas: actividad.horasEstimadas,
              descripcion: actividad.descripcion
            },
            metadata: {
              hasChildren: tareasCount > 0,
              totalChildren: tareasCount,
              progressPercentage: actividad.porcentajeAvance || 0,
              status: actividad.estado
            },
            children: []
          }
        })
        break


      case 'actividad':
        // Tareas de la actividad
        const tareas = await prisma.cotizacionTarea.findMany({
          where: { cotizacionActividadId: realId },
          orderBy: { orden: 'asc' }
        })

        children = tareas.map(tarea => ({
          id: `tarea-${tarea.id}`,
          type: 'tarea',
          nombre: tarea.nombre,
          level: 4,
          expanded: false,
          hasChildren: false,
          totalChildren: 0,
          progressPercentage: tarea.estado === 'completada' ? 100 : tarea.estado === 'en_progreso' ? 50 : 0,
          status: tarea.estado,
          data: {
            fechaInicio: tarea.fechaInicio?.toISOString().split('T')[0],
            fechaFin: tarea.fechaFin?.toISOString().split('T')[0],
            horasEstimadas: tarea.horasEstimadas,
            descripcion: tarea.descripcion
          },
          metadata: {
            hasChildren: false,
            totalChildren: 0,
            progressPercentage: tarea.estado === 'completada' ? 100 : tarea.estado === 'en_progreso' ? 50 : 0,
            status: tarea.estado
          },
          children: []
        }))
        break

      default:
        return NextResponse.json({ error: 'Tipo de nodo no soportado' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        children,
        parentId: nodeId,
        totalChildren: children.length
      }
    })

  } catch (error) {
    console.error('❌ Error obteniendo hijos del nodo:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}