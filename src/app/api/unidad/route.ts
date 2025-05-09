import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const unidades = await prisma.unidad.findMany({
      orderBy: { nombre: 'asc' }
    })
    return NextResponse.json(unidades)
  } catch (error) {
    console.error('❌ Error al obtener unidades:', error)
    return NextResponse.json({ error: 'Error al obtener unidades' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { nombre } = await req.json()
    if (!nombre) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const nueva = await prisma.unidad.create({ data: { nombre } })
    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear unidad:', error)
    return NextResponse.json({ error: 'Error al crear unidad' }, { status: 500 })
  }
}
