// ===================================================
// 📁 Archivo: route.ts
// 📌 Crea una cotización nueva basada en una plantilla
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { plantillaId, clienteId } = body

    if (!plantillaId || typeof plantillaId !== 'string') {
      return NextResponse.json({ error: 'ID de plantilla requerido' }, { status: 400 })
    }
    if (!clienteId || typeof clienteId !== 'string') {
      return NextResponse.json({ error: 'Debe seleccionar un cliente' }, { status: 400 })
    }

    const plantilla = await prisma.plantilla.findUnique({
      where: { id: plantillaId },
      include: {
        equipos: { include: { items: true } },
        servicios: { include: { items: true } },
        gastos: { include: { items: true } }, // ✅ AÑADIDO
      },
    })

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no válido' }, { status: 400 })
    }

    const baseData = {
      nombre: `Cotización de ${plantilla.nombre}`,
      clienteId,
      comercialId: session.user.id,
      plantillaId: plantilla.id,
      totalInterno: plantilla.totalInterno,
      totalCliente: plantilla.totalCliente,
      totalEquiposInterno: plantilla.totalEquiposInterno,
      totalEquiposCliente: plantilla.totalEquiposCliente,
      totalServiciosInterno: plantilla.totalServiciosInterno,
      totalServiciosCliente: plantilla.totalServiciosCliente,
      totalGastosInterno: plantilla.totalGastosInterno,
      totalGastosCliente: plantilla.totalGastosCliente,
      descuento: plantilla.descuento,
      grandTotal: plantilla.grandTotal,
      equipos: {
        create: plantilla.equipos.map(e => ({
          nombre: e.nombre,
          descripcion: e.descripcion,
          subtotalInterno: e.subtotalInterno,
          subtotalCliente: e.subtotalCliente,
          items: {
            create: e.items.map(item => ({
              catalogoEquipoId: item.catalogoEquipoId,
              codigo: item.codigo,
              descripcion: item.descripcion,
              categoria: item.categoria,
              unidad: item.unidad,
              marca: item.marca,
              cantidad: item.cantidad,
              precioInterno: item.precioInterno,
              precioCliente: item.precioCliente,
              costoInterno: item.costoInterno,
              costoCliente: item.costoCliente,
            })),
          },
        })),
      },
      servicios: {
        create: plantilla.servicios.map(s => ({
          categoria: s.nombre,
          subtotalInterno: s.subtotalInterno,
          subtotalCliente: s.subtotalCliente,
          items: {
            create: s.items.map(item => ({
              catalogoServicioId: item.catalogoServicioId,
              categoria: item.categoria,
              unidadServicioId: item.unidadServicioId,
              recursoId: item.recursoId,
              unidadServicioNombre: item.unidadServicioNombre,
              recursoNombre: item.recursoNombre,
              formula: item.formula,
              horaBase: item.horaBase,
              horaRepetido: item.horaRepetido,
              horaUnidad: item.horaUnidad,
              horaFijo: item.horaFijo,
              costoHora: item.costoHora,
              nombre: item.nombre,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              horaTotal: item.horaTotal,
              factorSeguridad: item.factorSeguridad,
              margen: item.margen,
              costoInterno: item.costoInterno,
              costoCliente: item.costoCliente,
            })),
          },
        })),
      },
      gastos: {
        create: plantilla.gastos.map(g => ({
          nombre: g.nombre,
          subtotalInterno: g.subtotalInterno,
          subtotalCliente: g.subtotalCliente,
          items: {
            create: g.items.map(item => ({
              nombre: item.nombre,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              factorSeguridad: item.factorSeguridad,
              margen: item.margen,
              costoInterno: item.costoInterno,
              costoCliente: item.costoCliente,
            })),
          },
        })),
      },
    }

    const cotizacion = await prisma.cotizacion.create({ data: baseData })
    return NextResponse.json(cotizacion)
  } catch (error: any) {
    console.error('❌ Error inesperado:', error)
    return NextResponse.json({ error: error?.message || 'Error inesperado' }, { status: 500 })
  }
}
