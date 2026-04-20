import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const usuarioId = searchParams.get('usuarioId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const where: any = {}
  if (estado) where.estado = estado
  if (usuarioId) where.usuarioId = usuarioId

  const prestamos = await prisma.prestamoHerramienta.findMany({
    where,
    include: {
      usuario: { select: { id: true, name: true, email: true } },
      entregadoPor: { select: { name: true } },
      recibidoPor: { select: { name: true } },
      proyecto: { select: { id: true, nombre: true, codigo: true } },
      items: {
        include: {
          herramientaUnidad: { include: { catalogoHerramienta: { select: { nombre: true, codigo: true } } } },
          catalogoHerramienta: { select: { nombre: true, codigo: true } },
        },
      },
    },
    orderBy: { fechaPrestamo: 'desc' },
    take: limit,
  })

  return NextResponse.json({ prestamos })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { usuarioId, proyectoId, fechaDevolucionEstimada, observaciones, items } = body

    if (!usuarioId || !items?.length) {
      return NextResponse.json({ error: 'usuarioId e items son requeridos' }, { status: 400 })
    }

    const almacen = await getAlmacenCentral()

    const prestamo = await prisma.$transaction(async (tx) => {
      // Validar disponibilidad
      for (const item of items) {
        if (item.herramientaUnidadId) {
          const unidad = await tx.herramientaUnidad.findUnique({ where: { id: item.herramientaUnidadId } })
          if (unidad?.estado !== 'disponible') {
            throw new Error(`La unidad ${unidad?.serie} no está disponible (estado: ${unidad?.estado})`)
          }
        } else if (item.catalogoHerramientaId) {
          const stock = await tx.stockAlmacen.findUnique({
            where: { almacenId_catalogoHerramientaId: { almacenId: almacen.id, catalogoHerramientaId: item.catalogoHerramientaId } },
          })
          if (!stock || stock.cantidadDisponible < item.cantidadPrestada) {
            throw new Error(`Stock insuficiente para herramienta`)
          }
        }
      }

      const prest = await tx.prestamoHerramienta.create({
        data: {
          usuarioId,
          proyectoId: proyectoId || null,
          fechaDevolucionEstimada: fechaDevolucionEstimada ? new Date(fechaDevolucionEstimada) : null,
          observaciones: observaciones || null,
          entregadoPorId: session.user.id,
          items: {
            create: items.map((item: any) => ({
              herramientaUnidadId: item.herramientaUnidadId || null,
              catalogoHerramientaId: item.catalogoHerramientaId || null,
              cantidadPrestada: item.cantidadPrestada || 1,
            })),
          },
        },
        include: { items: true },
      })

      // Actualizar estado de unidades + registrar movimientos
      for (const item of prest.items) {
        if (item.herramientaUnidadId) {
          await tx.herramientaUnidad.update({
            where: { id: item.herramientaUnidadId },
            data: { estado: 'prestada' },
          })
          await registrarMovimiento({
            almacenId: almacen.id,
            tipo: 'prestamo_herramienta',
            herramientaUnidadId: item.herramientaUnidadId,
            cantidad: 1,
            usuarioId: session.user.id,
            prestamoHerramientaId: prest.id,
          }, tx as any)
        } else if (item.catalogoHerramientaId) {
          await registrarMovimiento({
            almacenId: almacen.id,
            tipo: 'prestamo_herramienta',
            catalogoHerramientaId: item.catalogoHerramientaId,
            cantidad: item.cantidadPrestada,
            usuarioId: session.user.id,
            prestamoHerramientaId: prest.id,
          }, tx as any)
        }
      }

      return prest
    })

    return NextResponse.json(prestamo, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear préstamo:', error)
    return NextResponse.json({ error: error.message || 'Error al crear préstamo' }, { status: 500 })
  }
}
