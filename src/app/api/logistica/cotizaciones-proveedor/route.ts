import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'
import type { CotizacionProveedorPayload } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rawData = await prisma.cotizacionProveedor.findMany({
      include: {
        proveedor: true,
        proyecto: true,
        cotizacionProveedorItem: {
          include: {
            listaEquipoItem: true,
            listaEquipo: true,
          },
        },
      },
      orderBy: {
        codigo: 'asc',
      },
    })

    const data = rawData.map((cotizacion: any) => ({
      ...cotizacion,
      items: cotizacion.cotizacionProveedorItem?.map((item: any) => ({
        ...item,
        lista: item.listaEquipo
      }))
    }))

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al obtener cotizaciones: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body: CotizacionProveedorPayload = await request.json()

    if (!body.proveedorId || !body.proyectoId) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos requeridos: proveedorId, proyectoId' },
        { status: 400 }
      )
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: body.proyectoId },
    })

    if (!proyecto) {
      return NextResponse.json(
        { ok: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    const ultimaCotizacion = await prisma.cotizacionProveedor.findFirst({
      where: { proyectoId: body.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
    })

    const nuevoNumero = ultimaCotizacion ? ultimaCotizacion.numeroSecuencia + 1 : 1
    const codigoGenerado = `${proyecto.codigo}-COT-${String(nuevoNumero).padStart(3, '0')}`

    const nuevaCotizacion = await prisma.cotizacionProveedor.create({
      data: {
        id: randomUUID(),
        proveedorId: body.proveedorId,
        proyectoId: body.proyectoId,
        codigo: codigoGenerado,
        numeroSecuencia: nuevoNumero,
      },
    })

    return NextResponse.json({ ok: true, data: nuevaCotizacion })
  } catch (error) {
    console.error('Error al crear cotización:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al crear cotización: ' + String(error) },
      { status: 500 }
    )
  }
}
