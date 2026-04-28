// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/listas-equipo/[id]/
// 🔧 Descripción: API endpoints para operaciones individuales de listas de equipos
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { registrarActualizacion } from '@/lib/services/audit'
import { canDelete } from '@/lib/utils/deleteValidation'

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
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        listaEquipoItem: {
          include: {
            proyectoEquipoCotizado: {
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

    // Get existing data for audit comparison
    const listaExistente = await prisma.listaEquipo.findUnique({
      where: { id },
      select: { fechaNecesaria: true, nombre: true }
    })

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
        user: {
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

    // Audit fechaNecesaria changes specifically
    if (body.fechaNecesaria && listaExistente) {
      const oldFecha = listaExistente.fechaNecesaria?.toISOString().split('T')[0] || null
      const newFecha = body.fechaNecesaria
      if (oldFecha !== newFecha) {
        try {
          await registrarActualizacion(
            'LISTA_EQUIPO',
            id,
            session.user.id!,
            `Fecha necesaria actualizada en lista "${listaExistente.nombre}"`,
            {
              fechaNecesariaAnterior: oldFecha,
              fechaNecesariaNueva: newFecha
            }
          )
        } catch (auditError) {
          logger.error('Error al registrar cambio de fechaNecesaria:', auditError)
        }
      }
    }

    // ✅ Registrar en auditoría
    try {
      await registrarActualizacion(
        'LISTA_EQUIPO',
        id,
        session.user.id,
        `Lista "${listaEquipoActualizada.nombre}" actualizada`,
        body,
        {
          proyectoNombre: listaEquipoActualizada.proyecto.nombre,
          responsableNombre: listaEquipoActualizada.user.name
        }
      )
    } catch (auditError) {
      logger.error('Error al registrar auditoría:', auditError)
      // No fallar la actualización por error de auditoría
    }

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

    // 🛡️ Validar dependientes antes de eliminar
    const deleteCheck = await canDelete('listaEquipo', id)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // 📌 Obtener IDs de los lista items para detectar cotizados huérfanos
    // (estado='en_lista' con listaId=NULL pero listaEquipoSeleccionadoId apuntando aquí)
    const listaItemsDeLista = await prisma.listaEquipoItem.findMany({
      where: { listaId: id },
      select: { id: true },
    })
    const listaItemIds = listaItemsDeLista.map(li => li.id)

    // 🗑️ Resetear estado de items cotizados vinculados y eliminar lista
    await prisma.$transaction([
      prisma.proyectoEquipoCotizadoItem.updateMany({
        where: {
          estado: { in: ['en_lista', 'reemplazado'] },
          OR: [
            { listaId: id },
            ...(listaItemIds.length > 0 ? [{ listaEquipoSeleccionadoId: { in: listaItemIds } }] : []),
          ],
        },
        data: {
          estado: 'pendiente',
          listaId: null,
          listaEquipoSeleccionadoId: null,
        },
      }),
      prisma.listaEquipo.delete({
        where: { id }
      }),
    ])

    logger.info(`Lista de equipos eliminada: ${id}`, {
      userId: session.user.id,
      listaId: id
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