import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const cronogramaId = searchParams.get('cronogramaId')

  const dependencies = await prisma.proyectoDependenciasTarea.findMany({
    where: {
      tareaOrigen: {
        proyectoEdt: {
          proyectoId: id,
          ...(cronogramaId && { proyectoCronogramaId: cronogramaId })
        }
      }
    },
    include: {
      tareaOrigen: {
        select: { id: true, nombre: true }
      },
      tareaDependiente: {
        select: { id: true, nombre: true }
      }
    }
  })

  // Transformar para el frontend
  const formattedDependencies = dependencies.map(dep => ({
    id: dep.id,
    fromTaskId: dep.tareaOrigenId,
    toTaskId: dep.tareaDependienteId,
    type: dep.tipo,
    fromTaskName: dep.tareaOrigen.nombre,
    toTaskName: dep.tareaDependiente.nombre
  }))

  return NextResponse.json(formattedDependencies)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { fromTaskId, toTaskId, type = 'finish_to_start' } = await request.json()

  const dependency = await prisma.proyectoDependenciasTarea.create({
    data: {
      id: crypto.randomUUID(),
      tareaOrigenId: fromTaskId,
      tareaDependienteId: toTaskId,
      tipo: type
    }
  })

  return NextResponse.json(dependency)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dependencyId = searchParams.get('id')

  if (!dependencyId) {
    return NextResponse.json({ error: 'ID de dependencia requerido' }, { status: 400 })
  }

  await prisma.proyectoDependenciasTarea.delete({
    where: { id: dependencyId }
  })

  return NextResponse.json({ success: true })
}