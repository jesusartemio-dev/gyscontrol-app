import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/cotizaciones/versions/[id] - Obtener versión específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const version = await prisma.cotizacionVersion.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cotizacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            comercialId: true,
            cliente: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    if (!version) {
      return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = version.cotizacion?.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver esta versión' }, { status: 403 })
    }

    return NextResponse.json(version)
  } catch (error) {
    console.error('Error al obtener versión:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT /api/cotizaciones/versions/[id] - Actualizar estado de versión
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { estado } = await request.json()

    if (!estado) {
      return NextResponse.json({ error: 'Estado requerido' }, { status: 400 })
    }

    const versionExistente = await prisma.cotizacionVersion.findUnique({
      where: { id },
      include: { cotizacion: true }
    })

    if (!versionExistente) {
      return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = versionExistente.cotizacion?.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar esta versión' }, { status: 403 })
    }

    const versionActualizada = await prisma.cotizacionVersion.update({
      where: { id },
      data: { estado },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(versionActualizada)
  } catch (error) {
    console.error('Error al actualizar versión:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
