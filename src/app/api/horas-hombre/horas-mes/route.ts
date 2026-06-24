import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/horas-hombre/horas-mes?anio=YYYY&mes=M
// Devuelve el total de horas registradas por día del mes para el usuario actual
// Response: { horasPorDia, dias: { "YYYY-MM-DD": horas, ... } }
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const anio = parseInt(searchParams.get('anio') || '')
    const mes = parseInt(searchParams.get('mes') || '')

    if (!anio || !mes || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    // Rango del mes completo en UTC
    const inicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0))
    const fin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999)) // último día del mes

    const registros = await prisma.registroHoras.findMany({
      where: {
        usuarioId: session.user.id,
        fechaTrabajo: { gte: inicio, lte: fin }
      },
      select: { fechaTrabajo: true, horasTrabajadas: true }
    })

    // Agrupar por fecha (YYYY-MM-DD) sumando horas
    const dias: Record<string, number> = {}
    for (const r of registros) {
      // Los registros están almacenados a T12:00:00Z → toISOString().slice(0,10) da la fecha correcta
      const key = r.fechaTrabajo.toISOString().slice(0, 10)
      dias[key] = Math.round(((dias[key] ?? 0) + r.horasTrabajadas) * 10) / 10
    }

    const calendario = await prisma.calendarioLaboral.findFirst({
      where: { activo: true },
      select: { horasPorDia: true }
    })
    const horasPorDia = calendario?.horasPorDia ?? 9.5

    return NextResponse.json({ success: true, data: { horasPorDia, dias } })
  } catch (error) {
    console.error('Error obteniendo horas del mes:', error)
    return NextResponse.json({ error: 'Error interno', success: false }, { status: 500 })
  }
}
