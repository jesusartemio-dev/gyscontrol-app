// ===================================================
// 📁 Archivo: from-cotizacion/route.ts
// 📌 Crea un proyecto a partir de una cotización aprobada
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cotizacionId, gestorId, fechaInicio } = body

    if (!cotizacionId || !gestorId || !fechaInicio) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        equipos: { include: { items: true } },
        servicios: { include: { items: true } },
        gastos: { include: { items: true } },
      },
    })

    if (!cotizacion || cotizacion.estado !== 'aprobada') {
      return NextResponse.json({ error: 'Cotización no válida o no aprobada' }, { status: 400 })
    }

    const proyecto = await prisma.proyecto.create({
      data: {
        clienteId: cotizacion.clienteId!,
        comercialId: cotizacion.comercialId!,
        gestorId,
        cotizacionId,
        nombre: cotizacion.nombre,
        codigo: '',
        estado: 'activo',
        fechaInicio: new Date(fechaInicio),

        totalEquiposInterno: cotizacion.totalEquiposInterno,
        totalServiciosInterno: cotizacion.totalServiciosInterno,
        totalGastosInterno: cotizacion.totalGastosInterno,
        totalInterno: cotizacion.totalInterno,
        totalCliente: cotizacion.totalCliente,
        descuento: cotizacion.descuento,
        grandTotal: cotizacion.grandTotal,

        equipos: {
          create: cotizacion.equipos.map((grupo) => ({
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            responsableId: gestorId,
            items: {
              create: grupo.items.map((item) => ({
                catalogoEquipo: item.catalogoEquipoId
                  ? { connect: { id: item.catalogoEquipoId } }
                  : undefined,
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
          create: cotizacion.servicios.map((grupo) => ({
            categoria: grupo.categoria,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            responsableId: gestorId,
            items: {
              create: grupo.items.map((item) => ({
                catalogoServicio: item.catalogoServicioId
                  ? { connect: { id: item.catalogoServicioId } }
                  : undefined,
                categoria: item.categoria,
                costoHoraInterno: item.costoHora,
                costoHoraCliente: item.costoHora * item.margen,
                nombre: item.nombre,
                cantidadHoras: item.horaTotal,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
              })),
            },
          })),
        },

        gastos: {
          create: cotizacion.gastos.map((grupo) => ({
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            items: {
              create: grupo.items.map((item) => ({
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
      },
    })

    return NextResponse.json(proyecto)
  } catch (error) {
    console.error('❌ Error al crear proyecto desde cotización:', error)
    return NextResponse.json({ error: 'Error interno al crear proyecto' }, { status: 500 })
  }
}
