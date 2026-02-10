// ===================================================
// 📁 Archivo: /api/proyecto-gasto/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todos los grupos de gastos (ProyectoCotizadoGasto)
//    asociados a un proyecto específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const gastos = await prisma.proyectoGastoCotizado.findMany({
      where: { proyectoId: id },
      include: {
        proyectoGastoCotizadoItem: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    // Map relation names for frontend compatibility
    const gastosFormatted = gastos.map((gasto: any) => ({
      ...gasto,
      items: gasto.proyectoGastoCotizadoItem
    }))
    return NextResponse.json(gastosFormatted)
  } catch (error) {
    console.error('❌ Error al obtener gastos del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}