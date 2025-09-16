// ===================================================
// 📁 Archivo: from-cotizacion/route.ts
// 📌 Crea un proyecto a partir de una cotización aprobada
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProyectoFromCotizacionSchema } from '@/lib/validators/proyecto'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// ✅ Tipo explícito para cotización con includes
type CotizacionConIncludes = Prisma.CotizacionGetPayload<{
  include: {
    cliente: true
    equipos: { include: { items: true } }
    servicios: { include: { items: true } }
    gastos: { include: { items: true } }
  }
}>

// ✅ Type for CotizacionServicio with proper fields
type CotizacionServicioWithItems = {
  id: string
  nombre: string
  categoria: string
  subtotalInterno: number
  subtotalCliente: number
  items: any[]
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Validate request body using the new schema (includes cotizacionId)
    const validatedData = createProyectoFromCotizacionSchema.parse(body)
    const { 
      cotizacionId, 
      nombre, 
      fechaInicio, 
      fechaFin, 
      gestorId, 
      estado = 'en_planificacion',
      totalEquiposInterno,
      totalServiciosInterno,
      totalGastosInterno,
      totalInterno,
      totalCliente,
      descuento,
      grandTotal,
      clienteId,
      comercialId
    } = validatedData

    // ✅ Validate required fields
    if (!cotizacionId) {
      return NextResponse.json(
        { error: 'cotizacionId es requerido' },
        { status: 400 }
      )
    }

    const cotizacion: CotizacionConIncludes | null = await prisma.cotizacion.findUnique({
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

    // ✅ Validar que la cotización tenga cliente y comercial asignados
    if (!cotizacion.clienteId || !cotizacion.comercialId || !cotizacion.cliente) {
      return NextResponse.json({ 
        error: 'La cotización debe tener cliente y comercial asignados' 
      }, { status: 400 })
    }

    // 🔁 Auto-generate project code using cliente.codigo + formatted numeroSecuencia
    const cliente = cotizacion.cliente
    const currentSequence = cliente.numeroSecuencia || 1
    
    // 📡 Format sequence number: 2 digits if < 100, 3 digits if >= 100
    const formattedSequence = currentSequence < 100 
      ? currentSequence.toString().padStart(2, '0')
      : currentSequence.toString().padStart(3, '0')
    
    const generatedCodigo = `${cliente.codigo}${formattedSequence}`

    // 🔁 Update client's sequence number for next project
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { numeroSecuencia: currentSequence + 1 }
    })

    // 🔁 Calculate totals from request data or cotización data as fallback
    const finalTotalEquiposInterno = totalEquiposInterno ?? cotizacion.equipos.reduce((sum, grupo) => sum + (grupo as any).subtotalInterno, 0)
    const finalTotalServiciosInterno = totalServiciosInterno ?? cotizacion.servicios.reduce((sum, grupo) => sum + grupo.subtotalInterno, 0)
    const finalTotalGastosInterno = totalGastosInterno ?? cotizacion.gastos.reduce((sum, grupo) => sum + grupo.subtotalInterno, 0)
    const finalTotalInterno = totalInterno ?? (finalTotalEquiposInterno + finalTotalServiciosInterno + finalTotalGastosInterno)
    
    const finalTotalCliente = totalCliente ?? cotizacion.totalCliente ?? 0
    const finalDescuento = descuento ?? cotizacion.descuento ?? 0
    const finalGrandTotal = grandTotal ?? cotizacion.grandTotal ?? finalTotalCliente

    const proyecto = await prisma.proyecto.create({
      data: {
        clienteId: clienteId ?? cotizacion.clienteId,
        comercialId: comercialId ?? cotizacion.comercialId,
        gestorId,
        cotizacionId,
        nombre,
        codigo: generatedCodigo, // ✅ Use auto-generated code
        estado,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : undefined,

        totalEquiposInterno: finalTotalEquiposInterno,
        totalServiciosInterno: finalTotalServiciosInterno,
        totalGastosInterno: finalTotalGastosInterno,
        totalInterno: finalTotalInterno,
        totalCliente: finalTotalCliente,
        descuento: finalDescuento,
        grandTotal: finalGrandTotal,

        equipos: {
          create: cotizacion.equipos.map((grupo) => ({
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: (grupo as any).subtotalInterno,
            subtotalCliente: (grupo as any).subtotalCliente,
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
          create: cotizacion.servicios.map((grupo: CotizacionServicioWithItems) => ({
            nombre: grupo.nombre,
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
