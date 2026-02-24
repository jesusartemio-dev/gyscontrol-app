import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion', 'comercial']

function generarResumenDescuentos(descuentos: { desdeHoras: number; descuentoPct: number }[]): string {
  if (descuentos.length === 0) return ''
  return descuentos
    .map((d, i) => {
      const pct = Math.round(d.descuentoPct * 100)
      return i === 0
        ? `>${d.desdeHoras} HH: ${pct}%`
        : `>${d.desdeHoras} HH: +${pct}%`
    })
    .join(' | ')
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clienteId } = await params

    const tarifas = await prisma.tarifaClienteRecurso.findMany({
      where: { clienteId },
      include: {
        recurso: { select: { id: true, nombre: true, tipo: true, costoHora: true } },
      },
      orderBy: [{ recurso: { nombre: 'asc' } }, { modalidad: 'asc' }],
    })

    const descuentos = await prisma.configDescuentoHH.findMany({
      where: { clienteId, activo: true },
      orderBy: { orden: 'asc' },
    })

    const resumenDescuentos = generarResumenDescuentos(descuentos)

    return NextResponse.json({ tarifas, descuentos, resumenDescuentos })
  } catch (error) {
    console.error('Error al obtener tarifas HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: clienteId } = await params
    const body = await req.json()

    if (body.tipo === 'tarifa') {
      if (!body.recursoId || !body.modalidad || body.tarifaVenta == null) {
        return NextResponse.json({ error: 'Faltan campos: recursoId, modalidad, tarifaVenta' }, { status: 400 })
      }

      const tarifa = await prisma.tarifaClienteRecurso.upsert({
        where: {
          clienteId_recursoId_modalidad: {
            clienteId,
            recursoId: body.recursoId,
            modalidad: body.modalidad,
          },
        },
        update: {
          tarifaVenta: body.tarifaVenta,
          moneda: body.moneda || 'USD',
          activo: true,
        },
        create: {
          clienteId,
          recursoId: body.recursoId,
          modalidad: body.modalidad,
          tarifaVenta: body.tarifaVenta,
          moneda: body.moneda || 'USD',
        },
        include: {
          recurso: { select: { id: true, nombre: true, tipo: true, costoHora: true } },
        },
      })

      return NextResponse.json(tarifa, { status: 201 })
    }

    if (body.tipo === 'descuento') {
      if (body.desdeHoras == null || body.descuentoPct == null) {
        return NextResponse.json({ error: 'Faltan campos: desdeHoras, descuentoPct' }, { status: 400 })
      }

      let orden = body.orden
      if (orden == null) {
        const maxOrden = await prisma.configDescuentoHH.aggregate({
          where: { clienteId },
          _max: { orden: true },
        })
        orden = (maxOrden._max.orden ?? 0) + 1
      }

      const descuento = await prisma.configDescuentoHH.create({
        data: {
          clienteId,
          desdeHoras: body.desdeHoras,
          descuentoPct: body.descuentoPct,
          orden,
        },
      })

      return NextResponse.json(descuento, { status: 201 })
    }

    return NextResponse.json({ error: 'tipo debe ser "tarifa" o "descuento"' }, { status: 400 })
  } catch (error) {
    console.error('Error al crear tarifa/descuento HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: clienteId } = await params
    const { searchParams } = new URL(req.url)
    const tarifaId = searchParams.get('tarifaId')
    const descuentoId = searchParams.get('descuentoId')

    if (tarifaId) {
      await prisma.tarifaClienteRecurso.deleteMany({
        where: { id: tarifaId, clienteId },
      })
      return NextResponse.json({ ok: true })
    }

    if (descuentoId) {
      await prisma.configDescuentoHH.deleteMany({
        where: { id: descuentoId, clienteId },
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Debe enviar tarifaId o descuentoId' }, { status: 400 })
  } catch (error) {
    console.error('Error al eliminar tarifa/descuento HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
