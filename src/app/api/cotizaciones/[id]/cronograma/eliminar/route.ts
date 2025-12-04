// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/eliminar
// 🔧 Descripción: Eliminación completa del cronograma de una cotización
// ✅ DELETE: Eliminar todas las fases, EDTs, actividades, tareas y dependencias
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ DELETE /api/cotizaciones/[id]/cronograma/eliminar
export async function DELETE(
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
      return NextResponse.json({ error: 'No tiene permisos para eliminar el cronograma' }, { status: 403 })
    }

    // Ejecutar eliminación en transacción
    const result = await prisma.$transaction(async (tx) => {
      return await eliminarCronogramaCompleto(tx, id)
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Cronograma eliminado exitosamente. Se eliminaron ${result.totalEliminados} elementos`
    })

  } catch (error) {
    console.error('❌ Error eliminando cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

// Función principal para eliminar cronograma completo
async function eliminarCronogramaCompleto(tx: any, cotizacionId: string): Promise<{
  fasesEliminadas: number
  edtsEliminados: number
  zonasEliminadas: number
  actividadesEliminadas: number
  tareasEliminadas: number
  dependenciasEliminadas: number
  totalEliminados: number
}> {
  console.log(`🗑️ ELIMINACIÓN - Iniciando eliminación completa del cronograma para cotización: ${cotizacionId}`)

  let fasesEliminadas = 0
  let edtsEliminados = 0
  let zonasEliminadas = 0
  let actividadesEliminadas = 0
  let tareasEliminadas = 0
  let dependenciasEliminadas = 0

  // 1. Eliminar dependencias avanzadas (CotizacionDependenciaTarea)
  console.log('🗑️ ELIMINACIÓN - Eliminando dependencias avanzadas')
  try {
    // Obtener IDs de tareas de la cotización
    const tareaIds = await tx.cotizacionTarea.findMany({
      where: {
        cotizacion_actividad: {
          cotizacion_edt: { cotizacionId }
        }
      },
      select: { id: true }
    }).then((tasks: { id: string }[]) => tasks.map(t => t.id))

    const dependenciasAvanzadas = await tx.cotizacionDependenciaTarea.deleteMany({
      where: {
        OR: [
          { tareaOrigenId: { in: tareaIds } },
          { tareaDependienteId: { in: tareaIds } }
        ]
      }
    })
    dependenciasEliminadas = dependenciasAvanzadas.count
    console.log(`✅ ELIMINACIÓN - Dependencias avanzadas eliminadas: ${dependenciasAvanzadas.count}`)
  } catch (error) {
    console.warn('⚠️ ELIMINACIÓN - Error eliminando dependencias avanzadas:', error)
  }

  // 2. Eliminar dependencias simples en tareas (CotizacionTarea.dependenciaId)
  console.log('🗑️ ELIMINACIÓN - Limpiando dependencias simples en tareas')
  try {
    await tx.cotizacionTarea.updateMany({
      where: {
        cotizacion_actividad: {
          cotizacion_edt: { cotizacionId }
        }
      },
      data: { dependenciaId: null }
    })
    console.log('✅ ELIMINACIÓN - Dependencias simples limpiadas')
  } catch (error) {
    console.warn('⚠️ ELIMINACIÓN - Error limpiando dependencias simples:', error)
  }

  // 3. Eliminar tareas
  console.log('🗑️ ELIMINACIÓN - Eliminando tareas')
  const tareas = await tx.cotizacionTarea.deleteMany({
    where: {
      cotizacion_actividad: {
        cotizacion_edt: { cotizacionId }
      }
    }
  })
  tareasEliminadas = tareas.count
  console.log(`✅ ELIMINACIÓN - Tareas eliminadas: ${tareas.count}`)

  // 4. Eliminar actividades
  console.log('🗑️ ELIMINACIÓN - Eliminando actividades')
  const actividades = await tx.cotizacionActividad.deleteMany({
    where: {
      cotizacion_edt: { cotizacionId }
    }
  })
  actividadesEliminadas = actividades.count
  console.log(`✅ ELIMINACIÓN - Actividades eliminadas: ${actividades.count}`)

  // 5. Zonas eliminadas del sistema (no existen en el modelo actual)
  console.log('🗑️ ELIMINACIÓN - Zonas eliminadas del sistema (no existen)')

  // 6. Eliminar EDTs
  console.log('🗑️ ELIMINACIÓN - Eliminando EDTs')
  const edts = await tx.cotizacionEdt.deleteMany({
    where: { cotizacionId }
  })
  edtsEliminados = edts.count
  console.log(`✅ ELIMINACIÓN - EDTs eliminados: ${edts.count}`)

  // 7. Eliminar fases
  console.log('🗑️ ELIMINACIÓN - Eliminando fases')
  const fases = await tx.cotizacionFase.deleteMany({
    where: { cotizacionId }
  })
  fasesEliminadas = fases.count
  console.log(`✅ ELIMINACIÓN - Fases eliminadas: ${fases.count}`)

  const totalEliminados = fasesEliminadas + edtsEliminados + zonasEliminadas + actividadesEliminadas + tareasEliminadas + dependenciasEliminadas

  console.log(`✅ ELIMINACIÓN - Eliminación completa finalizada. Total elementos eliminados: ${totalEliminados}`)

  return {
    fasesEliminadas,
    edtsEliminados,
    zonasEliminadas,
    actividadesEliminadas,
    tareasEliminadas,
    dependenciasEliminadas,
    totalEliminados
  }
}