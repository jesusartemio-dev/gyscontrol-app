// ===================================================
// 📁 Archivo: /api/proyecto-gasto-item/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todos los ítems de gastos (ProyectoGastoCotizadoItem)
//    asociados a un proyecto específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const items = await prisma.proyectoGastoCotizadoItem.findMany({
      where: { gasto: { proyectoId: id } },
      include: {
        gasto: true,
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