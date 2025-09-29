// ===================================================
// 📁 Archivo: /api/proyecto-gasto/from-proyecto/[id]/route.ts
// 📌 Descripción: Obtener todos los grupos de gastos (ProyectoCotizadoGasto)
//    asociados a un proyecto específico
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const gastos = await prisma.proyectoCotizadoGasto.findMany({
      where: { proyectoId: id },
      include: {
        items: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })
    return NextResponse.json(gastos)
  } catch (error) {
    console.error('❌ Error al obtener gastos del proyecto:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}