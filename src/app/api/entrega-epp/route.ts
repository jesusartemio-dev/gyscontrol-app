import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento } from '@/lib/services/almacen'
import type { Prisma } from '@prisma/client'

async function generarNumeroEntregaEpp(client: any = prisma): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `EPP-${yy}${mm}${dd}`

  const ultimo = await client.entregaEPP.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }
  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

const includeRelations = {
  empleado: {
    select: {
      id: true,
      documentoIdentidad: true,
      cargo: { select: { nombre: true } },
      departamento: { select: { nombre: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  },
  almacen: { select: { id: true, nombre: true } },
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  centroCosto: { select: { id: true, nombre: true } },
  entregadoPor: { select: { id: true, name: true } },
  items: {
    include: {
      catalogoEpp: {
        select: {
          id: true,
          codigo: true,
          descripcion: true,
          marca: true,
          subcategoria: true,
          requiereTalla: true,
          unidad: { select: { nombre: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const empleadoId = searchParams.get('empleadoId')
    const almacenId = searchParams.get('almacenId')
    const proyectoId = searchParams.get('proyectoId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    const where: Prisma.EntregaEPPWhereInput = {}
    if (empleadoId) where.empleadoId = empleadoId
    if (almacenId) where.almacenId = almacenId
    if (proyectoId) where.proyectoId = proyectoId
    if (fechaDesde || fechaHasta) {
      where.fechaEntrega = {}
      if (fechaDesde) (where.fechaEntrega as any).gte = new Date(fechaDesde)
      if (fechaHasta) (where.fechaEntrega as any).lte = new Date(fechaHasta)
    }

    const data = await prisma.entregaEPP.findMany({
      where,
      include: includeRelations,
      orderBy: { fechaEntrega: 'desc' },
      take: 200,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener entregas EPP:', error)
    return NextResponse.json({ error: 'Error al obtener entregas EPP' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para registrar entregas EPP' }, { status: 403 })
    }

    const payload = await req.json()

    if (!payload.empleadoId) {
      return NextResponse.json({ error: 'empleadoId es requerido' }, { status: 400 })
    }
    if (!payload.almacenId) {
      return NextResponse.json({ error: 'almacenId es requerido' }, { status: 400 })
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un item' }, { status: 400 })
    }
    if (payload.proyectoId && payload.centroCostoId) {
      return NextResponse.json(
        { error: 'Imputación: proyecto O centro de costo, no ambos' },
        { status: 400 }
      )
    }

    // Validar empleado y almacén
    const [empleado, almacen] = await Promise.all([
      prisma.empleado.findUnique({ where: { id: payload.empleadoId } }),
      prisma.almacen.findUnique({ where: { id: payload.almacenId } }),
    ])
    if (!empleado || !empleado.activo) {
      return NextResponse.json({ error: 'Empleado no encontrado o inactivo' }, { status: 404 })
    }
    if (!almacen || !almacen.activo) {
      return NextResponse.json({ error: 'Almacén no encontrado o inactivo' }, { status: 404 })
    }

    // Validar stock disponible para cada item
    for (const item of payload.items) {
      if (!item.catalogoEppId || !item.cantidad || item.cantidad <= 0) {
        return NextResponse.json(
          { error: 'Cada item necesita catalogoEppId y cantidad > 0' },
          { status: 400 }
        )
      }
      const stock = await prisma.stockAlmacen.findUnique({
        where: {
          almacenId_catalogoEppId: {
            almacenId: payload.almacenId,
            catalogoEppId: item.catalogoEppId,
          },
        },
        include: { catalogoEpp: { select: { codigo: true, descripcion: true } } },
      })
      if (!stock || stock.cantidadDisponible < item.cantidad) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para ${stock?.catalogoEpp?.codigo ?? 'item'}: disponible ${stock?.cantidadDisponible ?? 0}, solicitado ${item.cantidad}`,
          },
          { status: 400 }
        )
      }
    }

    // Cargar catálogo de EPPs para calcular fechaReposicionEstimada
    const catalogoIds = payload.items.map((i: any) => i.catalogoEppId)
    const catalogos = await prisma.catalogoEPP.findMany({
      where: { id: { in: catalogoIds } },
      select: { id: true, vidaUtilDias: true, requiereTalla: true },
    })
    const catalogoMap = new Map(catalogos.map(c => [c.id, c]))

    const fechaEntrega = payload.fechaEntrega ? new Date(payload.fechaEntrega) : new Date()

    // Crear entrega + items + movimientos en transacción
    const entrega = await prisma.$transaction(async (tx) => {
      const numero = await generarNumeroEntregaEpp(tx)

      const created = await tx.entregaEPP.create({
        data: {
          numero,
          empleadoId: payload.empleadoId,
          almacenId: payload.almacenId,
          proyectoId: payload.proyectoId || null,
          centroCostoId: payload.centroCostoId || null,
          fechaEntrega,
          entregadoPorId: session.user.id,
          observaciones: payload.observaciones || null,
          firmaUrl: payload.firmaUrl || null,
          estado: 'vigente',
          updatedAt: new Date(),
        },
      })

      for (const item of payload.items) {
        const cat = catalogoMap.get(item.catalogoEppId)
        const fechaReposicion = cat?.vidaUtilDias
          ? new Date(fechaEntrega.getTime() + cat.vidaUtilDias * 24 * 60 * 60 * 1000)
          : null

        // Snapshot de costo: tomar del stock actual
        const stock = await tx.stockAlmacen.findUnique({
          where: {
            almacenId_catalogoEppId: {
              almacenId: payload.almacenId,
              catalogoEppId: item.catalogoEppId,
            },
          },
        })

        const itemCreado = await tx.entregaEPPItem.create({
          data: {
            entregaId: created.id,
            catalogoEppId: item.catalogoEppId,
            cantidad: item.cantidad,
            talla: cat?.requiereTalla ? item.talla || null : null,
            costoUnitario: stock?.costoUnitarioPromedio ?? null,
            costoMoneda: stock?.costoMoneda ?? 'PEN',
            fechaEntrega,
            fechaReposicionEstimada: fechaReposicion,
            estado: 'vigente',
            observaciones: item.observaciones || null,
            updatedAt: new Date(),
          },
        })

        await registrarMovimiento(
          {
            almacenId: payload.almacenId,
            tipo: 'salida_epp',
            catalogoEppId: item.catalogoEppId,
            cantidad: item.cantidad,
            costoUnitario: stock?.costoUnitarioPromedio ?? undefined,
            costoMoneda: stock?.costoMoneda ?? 'PEN',
            usuarioId: session.user.id,
            entregaEppItemId: itemCreado.id,
            observaciones: `Entrega ${numero} a empleado`,
          },
          tx as any
        )
      }

      return tx.entregaEPP.findUnique({
        where: { id: created.id },
        include: includeRelations,
      })
    })

    return NextResponse.json(entrega)
  } catch (error: any) {
    console.error('Error al crear entrega EPP:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al crear entrega EPP' },
      { status: 500 }
    )
  }
}
