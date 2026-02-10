import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const estadosActivos = searchParams.get('estadosActivos') === 'true'

    // Construir filtro
    const where: any = {}
    if (estado) {
      where.estado = estado
    } else if (estadosActivos) {
      // Estados activos para trabajo (excluir solo cerrado y cancelado)
      where.estado = {
        notIn: ['cerrado', 'cancelado']
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
