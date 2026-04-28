import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearEvento } from '@/lib/utils/trazabilidad'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']
const ROLES_FECHA_EMISION = ['admin']

const CAMPOS_PERMITIDOS = [
  'condicionPago',
  'formaPago',
  'diasCredito',
  'observaciones',
  'lugarEntrega',
  'tiempoEntrega',
  'contactoEntrega',
  'fechaEntregaEstimada',
  'fechaEmision',
] as const

type CampoEditable = (typeof CAMPOS_PERMITIDOS)[number]

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Solo admin, gerente o administración pueden editar datos administrativos' },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await prisma.ordenCompra.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        estado: true,
        proyectoId: true,
        condicionPago: true,
        formaPago: true,
        diasCredito: true,
        observaciones: true,
        lugarEntrega: true,
        tiempoEntrega: true,
        contactoEntrega: true,
        fechaEntregaEstimada: true,
        fechaEmision: true,
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }
    if (existing.estado === 'cancelada') {
      return NextResponse.json(
        { error: 'No se puede editar una OC cancelada' },
        { status: 400 }
      )
    }

    const payload = await req.json()

    const updateData: Record<string, any> = { updatedAt: new Date() }
    const cambios: Record<string, { antes: unknown; despues: unknown }> = {}

    const setIfChanged = (campo: CampoEditable, valorNuevo: unknown) => {
      const valorAnterior = (existing as any)[campo]
      if (valorAnterior !== valorNuevo) {
        cambios[campo] = { antes: valorAnterior, despues: valorNuevo }
      }
      updateData[campo] = valorNuevo
    }

    if (payload.condicionPago !== undefined) {
      const v = payload.condicionPago === null ? null : String(payload.condicionPago).trim() || null
      if (!v) {
        return NextResponse.json({ error: 'condicionPago no puede ser vacío' }, { status: 400 })
      }
      setIfChanged('condicionPago', v)
    }
    if (payload.formaPago !== undefined) {
      const v = payload.formaPago === null || payload.formaPago === '' ? null : String(payload.formaPago).trim()
      setIfChanged('formaPago', v)
    }
    if (payload.diasCredito !== undefined) {
      const v = payload.diasCredito === null || payload.diasCredito === '' ? null : Number(payload.diasCredito)
      if (v !== null && (Number.isNaN(v) || v < 0)) {
        return NextResponse.json({ error: 'diasCredito debe ser un número positivo' }, { status: 400 })
      }
      setIfChanged('diasCredito', v)
    }
    if (payload.observaciones !== undefined) {
      setIfChanged('observaciones', payload.observaciones || null)
    }
    if (payload.lugarEntrega !== undefined) {
      setIfChanged('lugarEntrega', payload.lugarEntrega || null)
    }
    if (payload.tiempoEntrega !== undefined) {
      setIfChanged('tiempoEntrega', payload.tiempoEntrega || null)
    }
    if (payload.contactoEntrega !== undefined) {
      setIfChanged('contactoEntrega', payload.contactoEntrega || null)
    }
    if (payload.fechaEntregaEstimada !== undefined) {
      const v = payload.fechaEntregaEstimada ? new Date(payload.fechaEntregaEstimada) : null
      if (v && Number.isNaN(v.getTime())) {
        return NextResponse.json({ error: 'fechaEntregaEstimada inválida' }, { status: 400 })
      }
      setIfChanged('fechaEntregaEstimada', v)
    }
    if (payload.fechaEmision !== undefined) {
      if (!ROLES_FECHA_EMISION.includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Solo el rol admin puede modificar la fecha de orden' },
          { status: 403 }
        )
      }
      const v = payload.fechaEmision ? new Date(payload.fechaEmision) : null
      if (!v) {
        return NextResponse.json({ error: 'fechaEmision no puede ser vacía' }, { status: 400 })
      }
      if (Number.isNaN(v.getTime())) {
        return NextResponse.json({ error: 'fechaEmision inválida' }, { status: 400 })
      }
      setIfChanged('fechaEmision', v)
    }

    if (Object.keys(cambios).length === 0) {
      return NextResponse.json({ error: 'No hay cambios que guardar' }, { status: 400 })
    }

    const tocaCondicionPago = 'condicionPago' in cambios || 'formaPago' in cambios || 'diasCredito' in cambios

    if (tocaCondicionPago) {
      const cxpsConPagos = await prisma.cuentaPorPagar.findMany({
        where: {
          ordenCompraId: id,
          estado: { not: 'anulada' },
          montoPagado: { gt: 0 },
        },
        select: { id: true, numeroFactura: true, estado: true, montoPagado: true, moneda: true },
      })

      if (cxpsConPagos.length > 0) {
        return NextResponse.json(
          {
            error:
              'No se puede modificar la condición de pago: existen cuentas por pagar con pagos registrados. Corrige el cambio directamente desde el módulo de Cuentas por Pagar.',
            cuentasPorPagarBloqueantes: cxpsConPagos,
          },
          { status: 409 }
        )
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ordenCompra.update({
        where: { id },
        data: updateData,
      })

      let cxpsSincronizadas = 0
      if (tocaCondicionPago) {
        const dataCxP: Record<string, any> = { updatedAt: new Date() }
        if ('condicionPago' in cambios) dataCxP.condicionPago = updateData.condicionPago
        if ('formaPago' in cambios) dataCxP.formaPago = updateData.formaPago
        if ('diasCredito' in cambios) dataCxP.diasCredito = updateData.diasCredito

        const sync = await tx.cuentaPorPagar.updateMany({
          where: {
            ordenCompraId: id,
            estado: { notIn: ['anulada', 'pagada'] },
            montoPagado: 0,
          },
          data: dataCxP,
        })
        cxpsSincronizadas = sync.count
      }

      return { updated, cxpsSincronizadas }
    })

    await crearEvento(prisma, {
      proyectoId: existing.proyectoId,
      tipo: 'oc_editada_administrativo',
      descripcion: `Edición administrativa de OC ${existing.numero} (estado: ${existing.estado}). Campos: ${Object.keys(cambios).join(', ')}`,
      usuarioId: session.user.id,
      metadata: {
        ordenCompraId: id,
        ocNumero: existing.numero,
        estado: existing.estado,
        cambios,
        cxpsSincronizadas: result.cxpsSincronizadas,
      },
    })

    return NextResponse.json({
      ok: true,
      ordenCompra: result.updated,
      cxpsSincronizadas: result.cxpsSincronizadas,
    })
  } catch (error) {
    console.error('Error en edición administrativa de OC:', error)
    return NextResponse.json(
      { error: 'Error al editar datos administrativos de la OC' },
      { status: 500 }
    )
  }
}
