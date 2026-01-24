// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/oportunidades/[id]/cotizaciones
// 🔧 Descripción: API para crear cotizaciones desde oportunidades CRM
// ✅ POST: Crear cotización con validación de una por oportunidad
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await request.json()
    const { plantillaId, nombre } = data

    // ✅ Validar que la oportunidad existe y NO tenga ya una cotización
    const oportunidad = await prisma.crmOportunidad.findUnique({
      where: { id }
    })

    if (!oportunidad) {
      return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 })
    }

    // ✅ Validar que la oportunidad NO tenga ya una cotización
    if (oportunidad.cotizacionId) {
      return NextResponse.json({
        error: 'Esta oportunidad ya tiene una cotización asociada. No se pueden crear múltiples cotizaciones por oportunidad.'
      }, { status: 400 })
    }

    // ✅ Generar código único para la cotización
    const year = new Date().getFullYear()
    const yearSuffix = year.toString().slice(-2)

    // Obtener el último número de secuencia para este año
    const lastCotizacion = await prisma.cotizacion.findFirst({
      where: {
        codigo: {
          startsWith: `GYS-`
        }
      },
      orderBy: {
        numeroSecuencia: 'desc'
      }
    })

    const nextSequence = (lastCotizacion?.numeroSecuencia || 0) + 1
    const codigo = `GYS-${nextSequence.toString().padStart(4, '0')}-${yearSuffix}`

    let nuevaCotizacion

    if (plantillaId) {
      // ✅ Obtener plantilla con validación de foreign keys
      const plantilla = await prisma.plantilla.findUnique({
        where: { id: plantillaId },
        include: {
          plantillaEquipo: { include: { plantillaEquipoItem: true } },
          plantillaServicio: {
            include: {
              plantillaServicioItem: {
                include: {
                  recurso: true, // ✅ Validar que el recurso existe
                  unidadServicio: true, // ✅ Validar que la unidad de servicio existe
                }
              }
            }
          },
          plantillaGasto: { include: { plantillaGastoItem: true } },
        },
      })

      if (!plantilla) {
        return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
      }

      // ✅ Validar que todos los servicios tienen recursos y unidades válidos
      for (const servicio of plantilla.plantillaServicio) {
        for (const item of servicio.plantillaServicioItem) {
          if (!item.recursoId || !item.unidadServicioId) {
            return NextResponse.json({
              error: `El servicio '${item.nombre}' tiene referencias inválidas. Recurso: ${item.recursoId}, Unidad: ${item.unidadServicioId}`
            }, { status: 400 })
          }
        }
      }

      const createData = {
        id: `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clienteId: oportunidad.clienteId,
        comercialId: oportunidad.comercialId,
        plantillaId: plantillaId,
        codigo: codigo,
        numeroSecuencia: nextSequence,
        nombre: nombre || oportunidad.nombre,
        totalEquiposInterno: plantilla.totalEquiposInterno,
        totalEquiposCliente: plantilla.totalEquiposCliente,
        totalServiciosInterno: plantilla.totalServiciosInterno,
        totalServiciosCliente: plantilla.totalServiciosCliente,
        totalGastosInterno: plantilla.totalGastosInterno,
        totalGastosCliente: plantilla.totalGastosCliente,
        totalInterno: plantilla.totalInterno,
        totalCliente: plantilla.totalCliente,
        descuento: plantilla.descuento,
        grandTotal: plantilla.grandTotal,
        updatedAt: new Date(),
        // Campos CRM
        prioridadCrm: oportunidad.prioridad,
        probabilidadCierre: oportunidad.probabilidad,
        competencia: oportunidad.competencia,
        fechaUltimoContacto: oportunidad.fechaUltimoContacto,
        retroalimentacionCliente: oportunidad.notas,
        // ✅ Copiar equipos con sus items
        cotizacionEquipo: {
          create: plantilla.plantillaEquipo.map(e => ({
            id: `cot-eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nombre: e.nombre,
            descripcion: e.descripcion,
            subtotalInterno: e.subtotalInterno,
            subtotalCliente: e.subtotalCliente,
            updatedAt: new Date(),
            cotizacionEquipoItem: {
              create: e.plantillaEquipoItem.map(item => ({
                id: `cot-eq-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
                updatedAt: new Date(),
              })),
            },
          })),
        },
        // ✅ Copiar servicios con sus items
        cotizacionServicio: {
          create: plantilla.plantillaServicio.map((s) => ({
            id: `cot-srv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nombre: s.nombre,
            categoria: s.categoria,
            subtotalInterno: Number(s.subtotalInterno),
            subtotalCliente: Number(s.subtotalCliente),
            updatedAt: new Date(),
            cotizacionServicioItem: {
              create: s.plantillaServicioItem.map(item => ({
                id: `cot-srv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                catalogoServicioId: item.catalogoServicioId,
                categoria: item.categoria,
                unidadServicioId: item.unidadServicioId, // ✅ Campo obligatorio
                recursoId: item.recursoId, // ✅ Campo obligatorio
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
                factorSeguridad: item.factorSeguridad || 1.0, // ✅ Valor por defecto
                margen: item.margen,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
                updatedAt: new Date(),
              })),
            },
          })),
        },
        // ✅ Copiar gastos con sus items
        cotizacionGasto: {
          create: plantilla.plantillaGasto.map(g => ({
            id: `cot-gasto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nombre: g.nombre,
            subtotalInterno: g.subtotalInterno,
            subtotalCliente: g.subtotalCliente,
            updatedAt: new Date(),
            cotizacionGastoItem: {
              create: g.plantillaGastoItem.map(item => ({
                id: `cot-gasto-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      }
      nuevaCotizacion = await prisma.cotizacion.create({
        data: createData as any
      })
    } else {
      // Crear cotización básica
      nuevaCotizacion = await prisma.cotizacion.create({
        data: {
          id: `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clienteId: oportunidad.clienteId,
          comercialId: oportunidad.comercialId,
          codigo: codigo,
          numeroSecuencia: nextSequence,
          nombre: nombre || oportunidad.nombre,
          // Campos CRM
          prioridadCrm: oportunidad.prioridad,
          probabilidadCierre: oportunidad.probabilidad,
          competencia: oportunidad.competencia,
          fechaUltimoContacto: oportunidad.fechaUltimoContacto,
          retroalimentacionCliente: oportunidad.notas,
          updatedAt: new Date()
        }
      })
    }

    // ✅ Actualizar la oportunidad con el ID de la cotización
    await prisma.crmOportunidad.update({
      where: { id },
      data: {
        cotizacionId: nuevaCotizacion.id,
        estado: 'propuesta_enviada'
      }
    })

    return NextResponse.json(nuevaCotizacion, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear cotización desde oportunidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}