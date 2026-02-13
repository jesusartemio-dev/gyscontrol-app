// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/proyectos/[id]/cronograma/eliminar
// 🔧 Descripción: Eliminación completa del cronograma de un proyecto
// ✅ DELETE: Eliminar todas las fases, EDTs, actividades, tareas y dependencias
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ✅ DELETE /api/proyectos/[id]/cronograma/eliminar
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener cronogramaId del query string (opcional)
    const { searchParams } = new URL(request.url)
    const cronogramaId = searchParams.get('cronogramaId')

    // Verificar permisos
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const userRole = session.user.role
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'proyectos'

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para eliminar el cronograma' }, { status: 403 })
    }

    // Ejecutar eliminación en transacción
    const result = await prisma.$transaction(async (tx) => {
      return await eliminarCronogramaCompleto(tx, proyectoId, cronogramaId)
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Cronograma eliminado exitosamente. Se eliminaron ${result.totalEliminados} elementos`
    })

  } catch (error) {
    logger.error('❌ Error eliminando cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función principal para eliminar cronograma completo
async function eliminarCronogramaCompleto(
  tx: any,
  proyectoId: string,
  cronogramaId: string | null
): Promise<{
  fasesEliminadas: number
  edtsEliminados: number
  actividadesEliminadas: number
  tareasEliminadas: number
  dependenciasEliminadas: number
  totalEliminados: number
}> {
  console.log(`🗑️ ELIMINACIÓN - Iniciando eliminación del cronograma para proyecto: ${proyectoId}`)
  if (cronogramaId) {
    console.log(`🗑️ ELIMINACIÓN - CronogramaId específico: ${cronogramaId}`)
  }

  let fasesEliminadas = 0
  let edtsEliminados = 0
  let actividadesEliminadas = 0
  let tareasEliminadas = 0
  let dependenciasEliminadas = 0

  // Construir filtro base
  const baseFilter = cronogramaId
    ? { proyectoId, proyectoCronogramaId: cronogramaId }
    : { proyectoId }

  // 0. Collect IDs for FK detachment
  const tareaIds = await tx.proyectoTarea.findMany({
    where: baseFilter,
    select: { id: true }
  }).then((tasks: { id: string }[]) => tasks.map(t => t.id))

  const edtIds = await tx.proyectoEdt.findMany({
    where: baseFilter,
    select: { id: true }
  }).then((edts: { id: string }[]) => edts.map(e => e.id))

  // 0b. Detach timesheet entries (nullify FKs, don't delete)
  if (tareaIds.length > 0) {
    await tx.registroHoras.updateMany({
      where: { proyectoTareaId: { in: tareaIds } },
      data: { proyectoTareaId: null },
    })
    // Detach campo tareas (RegistroHorasCampoTarea → ProyectoTarea FK)
    await tx.registroHorasCampoTarea.updateMany({
      where: { proyectoTareaId: { in: tareaIds } },
      data: { proyectoTareaId: null },
    })
  }
  if (edtIds.length > 0) {
    await tx.registroHoras.updateMany({
      where: { proyectoEdtId: { in: edtIds } },
      data: { proyectoEdtId: null },
    })
    await tx.registroHorasCampo.updateMany({
      where: { proyectoEdtId: { in: edtIds } },
      data: { proyectoEdtId: null },
    })
  }

  // 1. Eliminar dependencias (ProyectoDependenciasTarea)
  if (tareaIds.length > 0) {
    const dependencias = await tx.proyectoDependenciasTarea.deleteMany({
      where: {
        OR: [
          { tareaOrigenId: { in: tareaIds } },
          { tareaDependienteId: { in: tareaIds } }
        ]
      }
    })
    dependenciasEliminadas = dependencias.count

    // 1b. Eliminar subtareas
    await tx.proyectoSubtarea.deleteMany({
      where: { proyectoTareaId: { in: tareaIds } },
    })
  }

  // 2. Eliminar tareas
  const tareas = await tx.proyectoTarea.deleteMany({
    where: baseFilter
  })
  tareasEliminadas = tareas.count

  // 3. Eliminar actividades
  const actividades = await tx.proyectoActividad.deleteMany({
    where: cronogramaId
      ? { proyectoCronogramaId: cronogramaId }
      : { proyectoEdt: { proyectoId } }
  })
  actividadesEliminadas = actividades.count

  // 4. Eliminar EDTs
  const edts = await tx.proyectoEdt.deleteMany({
    where: baseFilter
  })
  edtsEliminados = edts.count

  // 5. Eliminar fases
  const fases = await tx.proyectoFase.deleteMany({
    where: baseFilter
  })
  fasesEliminadas = fases.count

  const totalEliminados = fasesEliminadas + edtsEliminados + actividadesEliminadas + tareasEliminadas + dependenciasEliminadas

  console.log(`✅ ELIMINACIÓN - Eliminación completa finalizada. Total elementos eliminados: ${totalEliminados}`)

  return {
    fasesEliminadas,
    edtsEliminados,
    actividadesEliminadas,
    tareasEliminadas,
    dependenciasEliminadas,
    totalEliminados
  }
}
