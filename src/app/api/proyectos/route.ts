import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const proyectos = await prisma.proyecto.findMany({
      include: {
        cliente: true,
        User_Proyecto_comercialIdToUser: true,
        User_Proyecto_gestorIdToUser: true,
        proyectoEquipoCotizado: true,
        proyectoServicioCotizado: true,
        proyectoGastoCotizado: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ ok: true, data: proyectos })
  } catch (error) {
    console.error('❌ Error al obtener proyectos:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al obtener proyectos: ' + String(error) },
      { status: 500 }
    )
  }
}
