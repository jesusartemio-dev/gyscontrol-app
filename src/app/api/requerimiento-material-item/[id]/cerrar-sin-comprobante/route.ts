import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const MOTIVO_MIN_LEN = 10
const MOTIVO_MAX_LEN = 500
const ALLOWED_ESTADOS = ['aprobado', 'depositado']
const ALLOWED_ROLES = ['admin', 'gerente', 'administracion', 'logistico', 'coordinador_logistico']

/**
 * POST /api/requerimiento-material-item/[id]/cerrar-sin-comprobante
 * Cierra un ítem del requerimiento registrando precio real sin comprobante (requiere motivo).
 * Body: { precioReal: number, motivo: string, fecha?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const precioReal = Number(body.precioReal)
    const motivo = String(body.motivo || '').trim()
    const fechaStr = body.fecha ? String(body.fecha) : null

    if (!Number.isFinite(precioReal) || precioReal <= 0) {
      return NextResponse.json({ error: 'El precio real debe ser mayor a 0' }, { status: 400 })
    }
    if (motivo.length < MOTIVO_MIN_LEN) {
      return NextResponse.json(
        { error: `El motivo debe tener al menos ${MOTIVO_MIN_LEN} caracteres` },
        { status: 400 }
      )
    }
    if (motivo.length > MOTIVO_MAX_LEN) {
      return NextResponse.json(
        { error: `El motivo no puede superar ${MOTIVO_MAX_LEN} caracteres` },
        { status: 400 }
      )
    }

    const item = await prisma.requerimientoMaterialItem.findUnique({
      where: { id },
      include: { hojaDeGastos: { select: { id: true, estado: true, numero: true } } },
    })
    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }
    if (!ALLOWED_ESTADOS.includes(item.hojaDeGastos.estado)) {
      return NextResponse.json(
        { error: `Solo se puede cerrar sin comprobante en estado aprobado o depositado (estado actual: ${item.hojaDeGastos.estado})` },
        { status: 409 }
      )
    }
    if (item.precioReal != null) {
      return NextResponse.json(
        { error: 'El ítem ya tiene precio real registrado. Elimine el comprobante o revierta antes.' },
        { status: 409 }
      )
    }

    const totalReal = precioReal * item.cantidadSolicitada
    const fecha = fechaStr
      ? new Date(fechaStr + 'T12:00:00.000Z')
      : new Date()

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.requerimientoMaterialItem.update({
        where: { id },
        data: {
          precioReal,
          totalReal,
          sinComprobante: true,
          motivoSinComprobante: motivo,
          cerradoSinCompEn: new Date(),
          cerradoSinCompPorId: session.user.id,
          updatedAt: new Date(),
        },
      })

      await tx.gastoLinea.create({
        data: {
          hojaDeGastosId: item.hojaDeGastosId,
          requerimientoMaterialItemId: item.id,
          descripcion: `${item.codigo} — ${item.descripcion}`,
          fecha,
          monto: totalReal,
          moneda: 'PEN',
          proyectoId: item.proyectoId || null,
          categoriaCosto: 'equipos',
          observaciones: `Sin documento: ${motivo}`,
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: item.hojaDeGastosId,
          tipo: 'item_cerrado_sin_comprobante',
          descripcion: `Ítem cerrado sin comprobante: ${item.codigo} — ${item.descripcion} (S/ ${totalReal.toFixed(2)})`,
          usuarioId: session.user.id,
          metadata: {
            itemId: id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            precioReal,
            totalReal,
            motivo,
          },
        },
      })

      return updatedItem
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al cerrar ítem sin comprobante:', error)
    return NextResponse.json(
      { error: 'Error al cerrar ítem: ' + String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/requerimiento-material-item/[id]/cerrar-sin-comprobante
 * Revierte un ítem cerrado sin comprobante (borra la GastoLinea asociada y limpia los flags).
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
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const item = await prisma.requerimientoMaterialItem.findUnique({
      where: { id },
      include: { hojaDeGastos: { select: { id: true, estado: true } } },
    })
    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }
    if (!ALLOWED_ESTADOS.includes(item.hojaDeGastos.estado)) {
      return NextResponse.json(
        { error: `Solo se puede revertir en estado aprobado o depositado (estado actual: ${item.hojaDeGastos.estado})` },
        { status: 409 }
      )
    }
    if (!item.sinComprobante) {
      return NextResponse.json(
        { error: 'El ítem no está cerrado sin comprobante' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.gastoLinea.deleteMany({
        where: { requerimientoMaterialItemId: id },
      })
      await tx.requerimientoMaterialItem.update({
        where: { id },
        data: {
          precioReal: null,
          totalReal: null,
          sinComprobante: false,
          motivoSinComprobante: null,
          cerradoSinCompEn: null,
          cerradoSinCompPorId: null,
          updatedAt: new Date(),
        },
      })
      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: item.hojaDeGastosId,
          tipo: 'item_revertido_sin_comprobante',
          descripcion: `Ítem revertido (volvió a pendiente): ${item.codigo} — ${item.descripcion}`,
          usuarioId: session.user.id,
          metadata: {
            itemId: id,
            codigo: item.codigo,
            descripcion: item.descripcion,
          },
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al revertir cierre sin comprobante:', error)
    return NextResponse.json(
      { error: 'Error al revertir: ' + String(error) },
      { status: 500 }
    )
  }
}
