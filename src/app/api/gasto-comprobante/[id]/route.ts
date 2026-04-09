import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/gasto-comprobante/[id]
 * Obtiene un comprobante con sus líneas y adjuntos.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const comprobante = await prisma.gastoComprobante.findUnique({
      where: { id },
      include: {
        lineas: {
          include: {
            proyecto: { select: { id: true, codigo: true, nombre: true } },
            centroCosto: { select: { id: true, nombre: true } },
            adjuntos: true,
          },
        },
        adjuntos: true,
      },
    })

    if (!comprobante) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
    }

    return NextResponse.json(comprobante)
  } catch (error) {
    console.error('Error al obtener comprobante:', error)
    return NextResponse.json({ error: 'Error al obtener comprobante' }, { status: 500 })
  }
}

/**
 * PATCH /api/gasto-comprobante/[id]
 * Edita un comprobante: cabecera + reemplaza líneas + recalcula precioReal.
 * Body igual al POST pero sin hojaDeGastosId.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const {
      tipoComprobante,
      numeroComprobante,
      proveedorNombre,
      proveedorRuc,
      montoTotal,
      fecha,
      observaciones,
      lineas = [],
    } = body

    const comprobante = await prisma.gastoComprobante.findUnique({
      where: { id },
      include: {
        hojaDeGastos: { select: { id: true, estado: true } },
        lineas: { select: { id: true, descripcion: true } },
      },
    })

    if (!comprobante) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
    }
    if (!['aprobado', 'depositado'].includes(comprobante.hojaDeGastos.estado)) {
      return NextResponse.json({ error: 'No se puede editar el comprobante en este estado' }, { status: 409 })
    }
    if (lineas.length === 0) {
      return NextResponse.json({ error: 'El comprobante debe tener al menos una línea' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resetear precioReal de items vinculados a las líneas actuales
      for (const linea of comprobante.lineas) {
        // Buscar si la línea tiene requerimientoMaterialItem vinculado
        const gastoLinea = await tx.gastoLinea.findUnique({
          where: { id: linea.id },
          select: { id: true },
        })
        if (gastoLinea) {
          // Resetear precioReal del item cuyo descripcion matchea esta línea
          const item = await tx.requerimientoMaterialItem.findFirst({
            where: { hojaDeGastosId: comprobante.hojaDeGastos.id },
            select: { id: true, codigo: true },
          })
          if (item && linea.descripcion.startsWith(item.codigo)) {
            await tx.requerimientoMaterialItem.update({
              where: { id: item.id },
              data: { precioReal: null, totalReal: null, updatedAt: new Date() },
            })
          }
        }
      }

      // 2. Resetear precioReal de TODOS los items del comprobante
      // (más robusto: buscar por descripción del item en la línea)
      for (const linea of comprobante.lineas) {
        // buscar item por código al inicio de la descripción
        const matchingItem = await tx.requerimientoMaterialItem.findFirst({
          where: {
            hojaDeGastosId: comprobante.hojaDeGastos.id,
            OR: [
              { descripcion: { contains: linea.descripcion.split(' —')[0] } },
              { codigo: linea.descripcion.split(' —')[0] },
            ],
          },
        })
        if (matchingItem) {
          await tx.requerimientoMaterialItem.update({
            where: { id: matchingItem.id },
            data: { precioReal: null, totalReal: null, updatedAt: new Date() },
          })
        }
      }

      // 3. Eliminar líneas antiguas
      await tx.gastoLinea.deleteMany({ where: { gastoComprobanteId: id } })

      // 4. Actualizar cabecera del comprobante
      const updated = await tx.gastoComprobante.update({
        where: { id },
        data: {
          tipoComprobante: tipoComprobante ?? comprobante.tipoComprobante,
          numeroComprobante: numeroComprobante ?? comprobante.numeroComprobante,
          proveedorNombre: proveedorNombre ?? comprobante.proveedorNombre,
          proveedorRuc: proveedorRuc ?? comprobante.proveedorRuc,
          montoTotal: montoTotal ?? comprobante.montoTotal,
          fecha: fecha ? new Date(fecha) : comprobante.fecha,
          observaciones: observaciones ?? comprobante.observaciones,
          updatedAt: new Date(),
        },
      })

      // 5. Crear nuevas líneas + actualizar precioReal
      const hojaDeGastosId = comprobante.hojaDeGastos.id
      const newTipo = tipoComprobante ?? comprobante.tipoComprobante
      const newNumero = numeroComprobante ?? comprobante.numeroComprobante
      const newFecha = fecha ? new Date(fecha) : comprobante.fecha

      for (const linea of lineas) {
        await tx.gastoLinea.create({
          data: {
            hojaDeGastosId,
            gastoComprobanteId: id,
            descripcion: linea.descripcion,
            fecha: newFecha,
            monto: linea.monto,
            moneda: linea.moneda || 'PEN',
            tipoComprobante: newTipo,
            numeroComprobante: newNumero,
            proveedorNombre: proveedorNombre ?? comprobante.proveedorNombre ?? null,
            proveedorRuc: proveedorRuc ?? comprobante.proveedorRuc ?? null,
            proyectoId: linea.proyectoId || null,
            centroCostoId: linea.centroCostoId || null,
            categoriaGastoId: linea.categoriaGastoId || null,
            categoriaCosto: linea.categoriaCosto || null,
            observaciones: linea.observaciones || null,
            updatedAt: new Date(),
          },
        })

        if (linea.requerimientoMaterialItemId && linea.cantidad) {
          const precioReal = linea.monto / linea.cantidad
          await tx.requerimientoMaterialItem.update({
            where: { id: linea.requerimientoMaterialItemId },
            data: { precioReal, totalReal: linea.monto, updatedAt: new Date() },
          })
        }
      }

      return updated
    })

    // Retornar comprobante actualizado con relaciones
    const full = await prisma.gastoComprobante.findUnique({
      where: { id },
      include: {
        adjuntos: { orderBy: { createdAt: 'asc' } },
        lineas: { select: { id: true, descripcion: true, monto: true, proyectoId: true } },
      },
    })

    return NextResponse.json(full)
  } catch (error) {
    console.error('Error al editar comprobante:', error)
    return NextResponse.json({ error: 'Error al editar comprobante: ' + String(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/gasto-comprobante/[id]
 * Elimina un comprobante y sus líneas (solo si la hoja está en aprobado/depositado).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const comprobante = await prisma.gastoComprobante.findUnique({
      where: { id },
      include: { hojaDeGastos: { select: { estado: true } } },
    })

    if (!comprobante) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
    }
    if (!['aprobado', 'depositado'].includes(comprobante.hojaDeGastos.estado)) {
      return NextResponse.json(
        { error: 'No se puede eliminar el comprobante en este estado' },
        { status: 409 }
      )
    }

    // Las líneas se eliminan en cascada por FK de GastoLinea.gastoComprobanteId? No, no hay cascade.
    // Necesitamos desvincular o borrar líneas primero.
    await prisma.$transaction(async (tx) => {
      // Desvincular las líneas del comprobante (no se borran, se convierten en líneas sueltas)
      await tx.gastoLinea.updateMany({
        where: { gastoComprobanteId: id },
        data: { gastoComprobanteId: null },
      })
      await tx.gastoComprobante.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar comprobante:', error)
    return NextResponse.json({ error: 'Error al eliminar comprobante' }, { status: 500 })
  }
}
