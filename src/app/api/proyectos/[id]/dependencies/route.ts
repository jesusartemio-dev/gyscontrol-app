import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const { fromTaskId, toTaskId, type = 'finish_to_start' } = await request.json()

  const dependency = await prisma.proyectoDependenciasTarea.create({
    data: {
      id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tareaOrigenId: fromTaskId,
      tareaDependienteId: toTaskId,
      tipo: type
    }
  })

  return NextResponse.json(dependency)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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