// ===================================================
// 📁 Archivo: /api/proyecto-gasto-item/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todos los ítems de gastos (ProyectoGastoCotizadoItem)
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

    const items = await prisma.proyectoGastoCotizadoItem.findMany({
      where: { proyectoGastoCotizado: { proyectoId: id } },
      include: {
        proyectoGastoCotizado: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('❌ Error al obtener ítems de gastos del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener ítems de gastos' }, { status: 500 })
  }
}