import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function generarNumeroOC(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `OC-${yy}${mm}${dd}`

  const ultimo = await prisma.ordenCompra.findFirst({
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
  proveedor: true,
  centroCosto: { select: { id: true, nombre: true, tipo: true } },
  pedidoEquipo: { select: { id: true, codigo: true, estado: true } },
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  solicitante: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  items: {
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
    const proveedorId = searchParams.get('proveedorId')
    const centroCostoId = searchParams.get('centroCostoId')
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')
    const busqueda = searchParams.get('busqueda')

    const where: any = {}
    if (proveedorId) where.proveedorId = proveedorId
    if (centroCostoId) where.centroCostoId = centroCostoId
    if (proyectoId) where.proyectoId = proyectoId
    if (estado) where.estado = estado
    if (busqueda) {
      where.OR = [
        { numero: { contains: busqueda, mode: 'insensitive' } },
        { proveedor: { nombre: { contains: busqueda, mode: 'insensitive' } } },
        { observaciones: { contains: busqueda, mode: 'insensitive' } },
      ]
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'logistico'].includes(role)) {
      where.solicitanteId = session.user.id
    }

    const data = await prisma.ordenCompra.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener órdenes de compra:', error)
    return NextResponse.json({ error: 'Error al obtener órdenes de compra' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'logistico'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para crear órdenes de compra' }, { status: 403 })
    }

    const payload = await req.json()

    if (!payload.proveedorId) {
      return NextResponse.json({ error: 'El proveedor es requerido' }, { status: 400 })
    }
    if (!payload.items || payload.items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un item' }, { status: 400 })
    }

    // Mutual exclusivity: proyectoId XOR centroCostoId
    const hasProyecto = !!payload.proyectoId
    const hasCentroCosto = !!payload.centroCostoId
    if (hasProyecto && hasCentroCosto) {
      return NextResponse.json({ error: 'Debe imputar a proyecto O centro de costo, no ambos' }, { status: 400 })
    }
    if (!hasProyecto && !hasCentroCosto) {
      return NextResponse.json({ error: 'Debe seleccionar un proyecto o centro de costo' }, { status: 400 })
    }

    // Validate proveedor exists
    const proveedor = await prisma.proveedor.findUnique({ where: { id: payload.proveedorId } })
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    // Validate proyecto or centro de costo
    if (hasProyecto) {
      const proyecto = await prisma.proyecto.findUnique({ where: { id: payload.proyectoId } })
      if (!proyecto) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
      }
    }
    if (hasCentroCosto) {
      const centroCosto = await prisma.centroCosto.findUnique({ where: { id: payload.centroCostoId } })
      if (!centroCosto) {
        return NextResponse.json({ error: 'Centro de costo no encontrado' }, { status: 404 })
      }
      if (!centroCosto.activo) {
        return NextResponse.json({ error: 'Centro de costo inactivo' }, { status: 400 })
      }
    }

    const numero = await generarNumeroOC()

    // Calculate totals
    const items = payload.items.map((item: any) => ({
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      costoTotal: item.cantidad * item.precioUnitario,
      pedidoEquipoItemId: item.pedidoEquipoItemId || null,
      listaEquipoItemId: item.listaEquipoItemId || null,
      updatedAt: new Date(),
    }))

    const subtotal = items.reduce((sum: number, i: any) => sum + i.costoTotal, 0)
    const igv = payload.moneda === 'USD' ? 0 : subtotal * 0.18
    const total = subtotal + igv

    const data = await prisma.ordenCompra.create({
      data: {
        numero,
        proveedorId: payload.proveedorId,
        centroCostoId: payload.centroCostoId || null,
        pedidoEquipoId: payload.pedidoEquipoId || null,
        proyectoId: payload.proyectoId || null,
        categoriaCosto: payload.categoriaCosto || 'equipos',
        solicitanteId: session.user.id,
        condicionPago: payload.condicionPago || 'contado',
        moneda: payload.moneda || 'PEN',
        subtotal,
        igv,
        total,
        lugarEntrega: payload.lugarEntrega || null,
        contactoEntrega: payload.contactoEntrega || null,
        observaciones: payload.observaciones || null,
        fechaEntregaEstimada: payload.fechaEntregaEstimada ? new Date(payload.fechaEntregaEstimada) : null,
        updatedAt: new Date(),
        items: {
          create: items,
        },
      },
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al crear orden de compra:', error)
    return NextResponse.json({ error: 'Error al crear orden de compra' }, { status: 500 })
  }
}
