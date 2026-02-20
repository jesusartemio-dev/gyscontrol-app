import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateNextCotizacionCode } from '@/lib/utils/cotizacionCodeGenerator'

export const dynamic = 'force-dynamic'

// POST /api/cotizaciones/versions/[id]/restore - Crear copia nueva desde snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get the version with its cotización info
    const version = await prisma.cotizacionVersion.findUnique({
      where: { id },
      include: {
        cotizacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            comercialId: true,
          }
        }
      }
    })

    if (!version) {
      return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })
    }

    // Permission check
    const userRole = (session.user as any).role
    const isOwner = version.cotizacion?.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }

    // Parse snapshot
    let snapshot: any
    try {
      snapshot = JSON.parse(version.snapshot)
    } catch {
      return NextResponse.json({ error: 'Snapshot inválido' }, { status: 400 })
    }

    // Generate new code
    const { codigo, numeroSecuencia } = await generateNextCotizacionCode()
    const now = new Date()
    const newCotId = `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create new cotización with data from snapshot
    const nuevaCotizacion = await prisma.$transaction(async (tx) => {
      // 1. Create main cotización
      const cot = await tx.cotizacion.create({
        data: {
          id: newCotId,
          codigo,
          numeroSecuencia,
          nombre: `${snapshot.nombre || version.cotizacion.nombre} (copia de v${version.version})`,
          clienteId: snapshot.clienteId || snapshot.cliente?.id || null,
          comercialId: snapshot.comercialId || snapshot.comercial?.id || session.user.id,
          estado: 'borrador',
          revision: 'R01',
          moneda: snapshot.moneda || 'USD',
          formaPago: snapshot.formaPago || null,
          validezOferta: snapshot.validezOferta ?? 15,
          totalEquiposInterno: snapshot.totalEquiposInterno || 0,
          totalEquiposCliente: snapshot.totalEquiposCliente || 0,
          totalServiciosInterno: snapshot.totalServiciosInterno || 0,
          totalServiciosCliente: snapshot.totalServiciosCliente || 0,
          totalGastosInterno: snapshot.totalGastosInterno || 0,
          totalGastosCliente: snapshot.totalGastosCliente || 0,
          totalInterno: snapshot.totalInterno || 0,
          totalCliente: snapshot.totalCliente || 0,
          descuento: 0,
          grandTotal: snapshot.totalCliente || 0,
          fecha: now,
          updatedAt: now,
        }
      })

      // 2. Create equipos + items
      const equipos = snapshot.equipos || []
      for (const grupo of equipos) {
        const equipoId = `ceq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await tx.cotizacionEquipo.create({
          data: {
            id: equipoId,
            cotizacionId: newCotId,
            nombre: grupo.nombre || '',
            descripcion: grupo.descripcion || null,
            subtotalInterno: grupo.subtotalInterno || 0,
            subtotalCliente: grupo.subtotalCliente || 0,
            plazoEntregaSemanas: grupo.plazoEntregaSemanas || null,
            updatedAt: now,
          }
        })

        const items = grupo.items || []
        for (const item of items) {
          await tx.cotizacionEquipoItem.create({
            data: {
              id: `cei-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              cotizacionEquipoId: equipoId,
              catalogoEquipoId: item.catalogoEquipoId || null,
              codigo: item.codigo || '',
              descripcion: item.descripcion || '',
              categoria: item.categoria || '',
              unidad: item.unidad || 'und',
              marca: item.marca || '',
              precioLista: item.precioLista || 0,
              precioInterno: item.precioInterno || 0,
              factorCosto: item.factorCosto ?? 1,
              factorVenta: item.factorVenta ?? 1.15,
              precioCliente: item.precioCliente || 0,
              cantidad: item.cantidad || 1,
              costoInterno: item.costoInterno || 0,
              costoCliente: item.costoCliente || 0,
              updatedAt: now,
            }
          })
        }
      }

      // 3. Create servicios + items
      const servicios = snapshot.servicios || []
      for (const grupo of servicios) {
        const servicioId = `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await tx.cotizacionServicio.create({
          data: {
            id: servicioId,
            cotizacionId: newCotId,
            nombre: grupo.nombre || '',
            edtId: grupo.edtId || grupo.edt?.id || '',
            subtotalInterno: grupo.subtotalInterno || 0,
            subtotalCliente: grupo.subtotalCliente || 0,
            plazoEntregaSemanas: grupo.plazoEntregaSemanas || null,
            updatedAt: now,
          }
        })

        const items = grupo.items || []
        for (const item of items) {
          await tx.cotizacionServicioItem.create({
            data: {
              id: `csi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              cotizacionServicioId: servicioId,
              catalogoServicioId: item.catalogoServicioId || null,
              unidadServicioId: item.unidadServicioId || '',
              recursoId: item.recursoId || '',
              nombre: item.nombre || '',
              descripcion: item.descripcion || '',
              edtId: item.edtId || grupo.edtId || grupo.edt?.id || '',
              unidadServicioNombre: item.unidadServicioNombre || '',
              recursoNombre: item.recursoNombre || '',
              formula: item.formula || 'base',
              horaBase: item.horaBase || 0,
              horaRepetido: item.horaRepetido || 0,
              horaUnidad: item.horaUnidad || null,
              horaFijo: item.horaFijo || null,
              costoHora: item.costoHora || 0,
              cantidad: item.cantidad || 1,
              horaTotal: item.horaTotal || 0,
              factorSeguridad: item.factorSeguridad ?? 1,
              margen: item.margen ?? 1,
              costoInterno: item.costoInterno || 0,
              costoCliente: item.costoCliente || 0,
              orden: item.orden || 0,
              nivelDificultad: item.nivelDificultad || 1,
              modoCalculo: item.modoCalculo || 'normal',
              updatedAt: now,
            }
          })
        }
      }

      // 4. Create gastos + items
      const gastos = snapshot.gastos || []
      for (const grupo of gastos) {
        const gastoId = `cgs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await tx.cotizacionGasto.create({
          data: {
            id: gastoId,
            cotizacionId: newCotId,
            nombre: grupo.nombre || '',
            descripcion: grupo.descripcion || null,
            subtotalInterno: grupo.subtotalInterno || 0,
            subtotalCliente: grupo.subtotalCliente || 0,
            plazoEntregaSemanas: grupo.plazoEntregaSemanas || null,
            updatedAt: now,
          }
        })

        const items = grupo.items || []
        for (const item of items) {
          await tx.cotizacionGastoItem.create({
            data: {
              id: `cgi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              gastoId: gastoId,
              catalogoGastoId: item.catalogoGastoId || null,
              nombre: item.nombre || '',
              descripcion: item.descripcion || null,
              cantidad: item.cantidad || 1,
              precioUnitario: item.precioUnitario || 0,
              factorSeguridad: item.factorSeguridad ?? 1,
              margen: item.margen ?? 1,
              costoInterno: item.costoInterno || 0,
              costoCliente: item.costoCliente || 0,
              updatedAt: now,
            }
          })
        }
      }

      // 5. Create condiciones
      const condiciones = snapshot.condiciones || []
      for (const cond of condiciones) {
        await tx.cotizacionCondicion.create({
          data: {
            id: `cco-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            cotizacionId: newCotId,
            catalogoCondicionId: cond.catalogoCondicionId || null,
            tipo: cond.tipo || null,
            descripcion: cond.descripcion || '',
            orden: cond.orden || 0,
            updatedAt: now,
          }
        })
      }

      // 6. Create exclusiones
      const exclusiones = snapshot.exclusiones || []
      for (const excl of exclusiones) {
        await tx.cotizacionExclusion.create({
          data: {
            id: `cex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            cotizacionId: newCotId,
            catalogoExclusionId: excl.catalogoExclusionId || null,
            descripcion: excl.descripcion || '',
            orden: excl.orden || 0,
            updatedAt: now,
          }
        })
      }

      // Return with includes
      return await tx.cotizacion.findUnique({
        where: { id: newCotId },
        include: {
          cliente: { select: { id: true, nombre: true } },
          user: { select: { id: true, name: true } },
        }
      })
    })

    return NextResponse.json({
      success: true,
      cotizacion: nuevaCotizacion,
      message: `Copia creada como ${codigo}`
    })
  } catch (error) {
    console.error('Error al restaurar versión:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
