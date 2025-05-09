import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await prisma.recurso.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /recurso:', error)
    return NextResponse.json({ error: 'Error al listar recursos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = await prisma.recurso.create({ data: body })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /recurso:', error)
    return NextResponse.json({ error: 'Error al crear recurso' }, { status: 500 })
  }
}
