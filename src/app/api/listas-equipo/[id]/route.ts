// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/listas-equipo/[id]/
// 🔧 Descripción: API endpoints para operaciones individuales de listas de equipos
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ✅ GET - Obtener lista de equipos por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 🔐 Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 📡 Buscar lista de equipos
    const listaEquipo = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            proyectoEquipo: {
              select: {
                id: true,
                nombre: true,
                descripcion: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!listaEquipo) {
      return NextResponse.json({ error: 'Lista de equipos no encontrada' }, { status: 404 })
    }

    logger.info(`Lista de equipos obtenida: ${id}`, {
      userId: session.user.id,
      listaId: id
    })

    return NextResponse.json(listaEquipo)

  } catch (error) {
    logger.error('Error al obtener lista de equipos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ PUT - Actualizar lista de equipos
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 🔐 Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // 🔍 Validación básica
    if (!body.nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // 📡 Actualizar lista de equipos
    const listaEquipoActualizada = await prisma.listaEquipo.update({
      where: { id },
      data: {
        nombre: body.nombre.trim(),
        fechaNecesaria: body.fechaNecesaria ? new Date(body.fechaNecesaria) : null,
        updatedAt: new Date()
      },
      include: {
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    logger.info(`Lista de equipos actualizada: ${id}`, {
      userId: session.user.id,
      listaId: id,
      changes: body
    })

    return NextResponse.json(listaEquipoActualizada)

  } catch (error) {
    logger.error('Error al actualizar lista de equipos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// 🗑️ DELETE - Eliminar lista de equipos
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 🔐 Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔍 Verificar que la lista existe
    const listaExistente = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        items: true,
        pedidoEquipos: true
      }
    })

    if (!listaExistente) {
      return NextResponse.json(
        { error: 'Lista de equipos no encontrada' },
        { status: 404 }
      )
    }

    // 🚫 Verificar que no tenga pedidos asociados
    if (listaExistente.pedidoEquipos && listaExistente.pedidoEquipos.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la lista porque tiene pedidos asociados' },
        { status: 400 }
      )
    }

    // 🚫 Verificar que esté en estado borrador
    if (listaExistente.estado !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar listas en estado borrador' },
        { status: 400 }
      )
    }

    // 🗑️ Eliminar lista (los items se eliminan automáticamente por CASCADE)
    await prisma.listaEquipo.delete({
      where: { id }
    })

    logger.info(`Lista de equipos eliminada: ${id}`, {
      userId: session.user.id,
      listaId: id,
      itemsCount: listaExistente.items?.length || 0
    })

    return NextResponse.json(
      { message: 'Lista de equipos eliminada correctamente' },
      { status: 200 }
    )

  } catch (error) {
    logger.error('Error al eliminar lista de equipos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}