import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // Obtener plantilla completa con todas las relaciones
    const original = await prisma.plantilla.findUnique({
      where: { id },
      include: {
        plantillaEquipo: {
          include: { plantillaEquipoItem: true },
        },
        plantillaServicio: {
          include: { plantillaServicioItem: true },
        },
        plantillaGasto: {
          include: { plantillaGastoItem: true },
        },
        plantillaCondicion: true,
        plantillaExclusion: true,
      },
    })

    if (!original) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    const ts = Date.now()
    const rnd = () => Math.random().toString(36).substr(2, 9)

    // Crear la plantilla duplicada con todos los datos anidados
    const duplicada = await prisma.plantilla.create({
      data: {
        id: `plantilla-${ts}-${rnd()}`,
        nombre: `${original.nombre} (Copia)`,
        tipo: original.tipo,
        estado: 'borrador',
        descuento: original.descuento,
        totalEquiposInterno: original.totalEquiposInterno,
        totalEquiposCliente: original.totalEquiposCliente,
        totalServiciosInterno: original.totalServiciosInterno,
        totalServiciosCliente: original.totalServiciosCliente,
        totalGastosInterno: original.totalGastosInterno,
        totalGastosCliente: original.totalGastosCliente,
        totalInterno: original.totalInterno,
        totalCliente: original.totalCliente,
        grandTotal: original.grandTotal,
        updatedAt: new Date(),
        // Equipos
        plantillaEquipo: {
          create: original.plantillaEquipo.map((eq) => ({
            id: `pe-${ts}-${rnd()}`,
            nombre: eq.nombre,
            descripcion: eq.descripcion,
            subtotalInterno: eq.subtotalInterno,
            subtotalCliente: eq.subtotalCliente,
            updatedAt: new Date(),
            plantillaEquipoItem: {
              create: eq.plantillaEquipoItem.map((item) => ({
                id: `pei-${ts}-${rnd()}`,
                catalogoEquipoId: item.catalogoEquipoId,
                codigo: item.codigo,
                descripcion: item.descripcion,
                marca: item.marca,
                categoria: item.categoria,
                unidad: item.unidad,
                cantidad: item.cantidad,
                precioLista: item.precioLista,
                precioInterno: item.precioInterno,
                margen: item.margen,
                precioCliente: item.precioCliente,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
                updatedAt: new Date(),
              })),
            },
          })),
        },
        // Servicios
        plantillaServicio: {
          create: original.plantillaServicio.map((sv) => ({
            id: `ps-${ts}-${rnd()}`,
            nombre: sv.nombre,
            categoria: sv.categoria,
            descripcion: sv.descripcion,
            subtotalInterno: sv.subtotalInterno,
            subtotalCliente: sv.subtotalCliente,
            updatedAt: new Date(),
            plantillaServicioItem: {
              create: sv.plantillaServicioItem.map((item) => ({
                id: `psi-${ts}-${rnd()}`,
                catalogoServicioId: item.catalogoServicioId,
                recursoId: item.recursoId,
                unidadServicioId: item.unidadServicioId,
                nombre: item.nombre,
                descripcion: item.descripcion,
                categoria: item.categoria,
                unidadServicioNombre: item.unidadServicioNombre,
                recursoNombre: item.recursoNombre,
                formula: item.formula,
                horaBase: item.horaBase,
                horaRepetido: item.horaRepetido,
                horaUnidad: item.horaUnidad,
                horaFijo: item.horaFijo,
                costoHora: item.costoHora,
                cantidad: item.cantidad,
                horaTotal: item.horaTotal,
                factorSeguridad: item.factorSeguridad,
                margen: item.margen,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
                updatedAt: new Date(),
              })),
            },
          })),
        },
        // Gastos
        plantillaGasto: {
          create: original.plantillaGasto.map((g) => ({
            id: `pg-${ts}-${rnd()}`,
            nombre: g.nombre,
            descripcion: g.descripcion,
            subtotalInterno: g.subtotalInterno,
            subtotalCliente: g.subtotalCliente,
            updatedAt: new Date(),
            plantillaGastoItem: {
              create: g.plantillaGastoItem.map((item) => ({
                id: `pgi-${ts}-${rnd()}`,
                nombre: item.nombre,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                factorSeguridad: item.factorSeguridad,
                margen: item.margen,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
                updatedAt: new Date(),
              })),
            },
          })),
        },
        // Condiciones
        plantillaCondicion: {
          create: (original.plantillaCondicion || []).map((c, i) => ({
            id: `pc-${ts}-${rnd()}`,
            catalogoCondicionId: c.catalogoCondicionId,
            tipo: c.tipo,
            descripcion: c.descripcion,
            orden: c.orden ?? i,
          })),
        },
        // Exclusiones
        plantillaExclusion: {
          create: (original.plantillaExclusion || []).map((e, i) => ({
            id: `px-${ts}-${rnd()}`,
            catalogoExclusionId: e.catalogoExclusionId,
            descripcion: e.descripcion,
            orden: e.orden ?? i,
          })),
        },
      },
    })

    return NextResponse.json({ id: duplicada.id, nombre: duplicada.nombre }, { status: 201 })
  } catch (error) {
    console.error('Error al duplicar plantilla:', error)
    return NextResponse.json({ error: 'Error interno al duplicar' }, { status: 500 })
  }
}
