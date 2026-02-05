import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const estadosActivos = searchParams.get('estadosActivos') === 'true'

    // Construir filtro
    const where: any = {}
    if (estado) {
      where.estado = estado
    } else if (estadosActivos) {
      // Estados activos para trabajo en campo (excluir cerrado, cancelado, pausado)
      where.estado = {
        in: ['en_planificacion', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados', 'en_ejecucion', 'en_cierre']
      }
    }

    const proyectos = await prisma.proyecto.findMany({
      where,
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
        supervisor: true,
        lider: true,
        proyectoEquipoCotizado: true,
        proyectoServicioCotizado: true,
        proyectoGastoCotizado: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`📋 Proyectos: encontrados ${proyectos.length} (filtro: ${estado || (estadosActivos ? 'activos' : 'todos')})`)

    return NextResponse.json({ ok: true, data: proyectos, proyectos })
  } catch (error) {
    console.error('❌ Error al obtener proyectos:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al obtener proyectos: ' + String(error) },
      { status: 500 }
    )
  }
}
