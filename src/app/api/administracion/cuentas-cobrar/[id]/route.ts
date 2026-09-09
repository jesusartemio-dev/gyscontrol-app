import { tieneRol } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canDelete } from '@/lib/utils/deleteValidation'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const cxc = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        cliente: { select: { id: true, nombre: true, ruc: true, diasPagoProgramados: true } },
        valorizacion: {
          select: {
            id: true, codigo: true, numero: true, proyectoId: true,
            cobro: {
              include: { abonos: { orderBy: { fechaReal: 'asc' } } },
            },
          },
        },
        pagos: {
          include: {
            cuentaBancaria: { select: { id: true, nombreBanco: true, numeroCuenta: true } },
            // Un pago ligado a un evento del Cronograma de Cobro (factoring) se
            // revierte desde ahí (respeta orden entre eventos y efectos del
            // excedente) — no desde "Anular pago" del Historial, que no sabe
            // nada de AbonoValorizacion.
            abonoValorizacion: { select: { id: true } },
          },
          orderBy: { fechaPago: 'desc' },
        },
        adjuntos: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!cxc) return NextResponse.json({ error: 'CxC no encontrada' }, { status: 404 })
    return NextResponse.json(cxc)
  } catch (error) {
    console.error('Error al obtener CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_ALLOWED)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.cuentaPorCobrar.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 })
    }

    // Anular
    if (body.estado === 'anulada') {
      if (existing.estado === 'anulada') {
        return NextResponse.json({ error: 'La cuenta ya está anulada' }, { status: 400 })
      }
      const updated = await prisma.cuentaPorCobrar.update({
        where: { id },
        data: { estado: 'anulada', updatedAt: new Date() },
      })
      return NextResponse.json(updated)
    }

    // Editar campos administrativos (no toca monto/saldo/estado financiero — solo metadata)
    //
    // Los descuentos de ley se editan acá porque son datos de LA FACTURA. Las
    // CxC facturadas antes de que existieran estos campos no pasaron por el
    // paso de Facturación que los captura, así que este es su único camino
    // — a mano, o aplicándolos desde "Verificar contra la factura".
    const editableFields = [
      'fechaEmision', 'fechaRecepcion', 'ordenCompraCliente', 'numeroHES', 'numeroGuiaRemision',
      'numeroNegociacion', 'bancoFinanciera', 'tipoCambio', 'diasCredito',
      'observaciones', 'descripcion', 'numeroDocumento',
      'detraccionPct', 'detraccionMonto', 'detraccionMontoPEN', 'detraccionCodigo',
      'retencionPct', 'retencionMonto',
    ] as const

    const NUMERICOS = new Set([
      'detraccionPct', 'detraccionMonto', 'detraccionMontoPEN', 'retencionPct', 'retencionMonto',
    ])

    const data: Record<string, any> = {}
    for (const field of editableFields) {
      if (field in body) {
        const value = body[field]
        if (field === 'fechaRecepcion' || field === 'fechaEmision') {
          data[field] = value ? new Date(value) : null
        } else if (NUMERICOS.has(field)) {
          // Vienen del formulario como string; vacío o ilegible = sin dato.
          const n = value === '' || value == null ? null : Number(value)
          data[field] = n != null && Number.isFinite(n) ? n : null
        } else {
          data[field] = value === '' ? null : value
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    data.updatedAt = new Date()

    // La detracción/retención se guarda en 3 lugares que pueden desincronizarse:
    // CuentaPorCobrar (donde escribe este endpoint), CobroValorizacion (lo que
    // muestra y edita la Hoja de Liquidación una vez que ya hay un cobro
    // registrado — y esos valores GANAN sobre los de la CxC al cargar el
    // formulario) y AbonoValorizacion.montoEsperado (lo que muestra el
    // Cronograma). Sin esto, "Verificar factura" corrige la CxC pero la
    // pantalla sigue mostrando el número viejo — exactamente lo que pasó con
    // FMK01: corregido a 510.06 acá, pero la Hoja de Liquidación y el
    // Cronograma seguían en 509.98.
    const camposCobro: Record<string, number | null> = {}
    for (const campo of ['detraccionPct', 'detraccionMonto', 'retencionPct', 'retencionMonto'] as const) {
      if (campo in data) camposCobro[campo] = data[campo]
    }

    const updated = await prisma.$transaction(async tx => {
      const cxc = await tx.cuentaPorCobrar.update({ where: { id }, data })

      if (Object.keys(camposCobro).length > 0 && cxc.valorizacionId) {
        const cobro = await tx.cobroValorizacion.findUnique({ where: { valorizacionId: cxc.valorizacionId } })
        if (cobro) {
          await tx.cobroValorizacion.update({
            where: { id: cobro.id },
            data: { ...camposCobro, updatedAt: new Date() },
          })
          // El Cronograma solo se corrige mientras el evento sigue pendiente
          // — un evento ya 'recibido' cerró con el monto real que se le puso
          // en su momento, y reescribir su esperado después sería reescribir
          // historia.
          if ('detraccionMonto' in camposCobro) {
            await tx.abonoValorizacion.updateMany({
              where: { cobroId: cobro.id, tipo: 'detraccion', estado: 'pendiente' },
              data: { montoEsperado: camposCobro.detraccionMonto },
            })
          }
          if ('retencionMonto' in camposCobro) {
            await tx.abonoValorizacion.updateMany({
              where: { cobroId: cobro.id, tipo: 'retencion', estado: 'pendiente' },
              data: { montoEsperado: camposCobro.retencionMonto },
            })
          }
        }
      }

      return cxc
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_ALLOWED)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    // 🛡️ Validar dependientes antes de eliminar
    const deleteCheck = await canDelete('cuentaPorCobrar', id)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // Eliminar CxC (pagos y adjuntos se eliminan por cascade)
    await prisma.cuentaPorCobrar.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
