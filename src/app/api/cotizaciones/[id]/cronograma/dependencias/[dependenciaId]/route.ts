import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ✅ DELETE /api/cotizaciones/[id]/cronograma/dependencias/[dependenciaId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: cotizacionId, dependenciaId } = await params
    const session = await getServerSession(authOptions)

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 🔍 Verificar que la dependencia existe y pertenece a la cotización
    const dependencia = await prisma.cotizacionDependenciaTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigenId: {
          in: await prisma.cotizacionTarea.findMany({
            where: {
              cotizacion_actividad: {
                cotizacion_edt: { cotizacionId }
              }
            },
            select: { id: true }
          }).then((tasks: any[]) => tasks.map((t: any) => t.id))
        }
      }
    })

    if (!dependencia) {
      return NextResponse.json({
        error: 'Dependencia no encontrada o no pertenece a esta cotización'
      }, { status: 404 })
    }

    // ✅ Eliminar dependencia
    await prisma.cotizacionDependenciaTarea.delete({
      where: { id: dependenciaId }
    })

    return NextResponse.json({
      success: true,
      message: 'Dependencia eliminada correctamente'
    })

  } catch (error) {
    console.error('❌ Error eliminando dependencia:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}