import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { plantillaSchema } from '@/lib/validators/plantilla'

export async function GET() {
  const plantillas = await prisma.plantilla.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(plantillas)
}

export async function POST(req: Request) {
  const body = await req.json()

  const validacion = plantillaSchema.safeParse(body)

  if (!validacion.success) {
    return NextResponse.json({ error: validacion.error.format() }, { status: 400 })
  }

  const nueva = await prisma.plantilla.create({
    data: validacion.data,
  })

  return NextResponse.json(nueva, { status: 201 })
}