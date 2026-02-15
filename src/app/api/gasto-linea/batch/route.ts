import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface BatchLineaPayload {
  categoriaGastoId?: string | null
  descripcion: string
  fecha: string
  monto: number
  moneda?: string
  tipoComprobante?: string | null
  numeroComprobante?: string | null
  proveedorNombre?: string | null
  proveedorRuc?: string | null
  observaciones?: string | null
}

interface BatchRequest {
  hojaDeGastosId: string
  lineas: BatchLineaPayload[]
}

const ESTADOS_EDITABLES = ['borrador', 'rechazado', 'aprobado', 'depositado']

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload: BatchRequest = await req.json()

    if (!payload.hojaDeGastosId) {
      return NextResponse.json({ error: 'hojaDeGastosId es requerido' }, { status: 400 })
    }
    if (!Array.isArray(payload.lineas) || payload.lineas.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos una línea' }, { status: 400 })
    }

    // Validar hoja existe y está en estado editable
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id: payload.hojaDeGastosId },
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (!ESTADOS_EDITABLES.includes(hoja.estado)) {
      return NextResponse.json({ error: 'No se pueden agregar líneas en este estado' }, { status: 400 })
    }

    // Validar cada línea
    for (let i = 0; i < payload.lineas.length; i++) {
      const l = payload.lineas[i]
      if (!l.descripcion?.trim()) {
        return NextResponse.json({ error: `Línea ${i + 1}: descripción es requerida` }, { status: 400 })
      }
      if (!l.fecha) {
        return NextResponse.json({ error: `Línea ${i + 1}: fecha es requerida` }, { status: 400 })
      }
      if (typeof l.monto !== 'number' || l.monto <= 0) {
        return NextResponse.json({ error: `Línea ${i + 1}: monto debe ser mayor a 0` }, { status: 400 })
      }
    }

    // Crear todas las líneas en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const createdLineas = []

      for (const l of payload.lineas) {
        const linea = await tx.gastoLinea.create({
          data: {
            hojaDeGastosId: payload.hojaDeGastosId,
            categoriaGastoId: l.categoriaGastoId || null,
            descripcion: l.descripcion,
            fecha: new Date(l.fecha),
            monto: l.monto,
            moneda: l.moneda || 'PEN',
            tipoComprobante: l.tipoComprobante || null,
            numeroComprobante: l.numeroComprobante || null,
            proveedorNombre: l.proveedorNombre || null,
            proveedorRuc: l.proveedorRuc || null,
            observaciones: l.observaciones || null,
            updatedAt: new Date(),
          },
          include: { adjuntos: true, categoriaGasto: true },
        })
        createdLineas.push(linea)
      }

      // Recalcular montoGastado de la hoja
      const totalResult = await tx.gastoLinea.aggregate({
        where: { hojaDeGastosId: payload.hojaDeGastosId },
        _sum: { monto: true },
      })
      const montoGastado = totalResult._sum.monto || 0

      await tx.hojaDeGastos.update({
        where: { id: payload.hojaDeGastosId },
        data: {
          montoGastado,
          saldo: hoja.montoDepositado - montoGastado,
          updatedAt: new Date(),
        },
      })

      return createdLineas
    })

    return NextResponse.json({ ok: true, data: result, count: result.length })
  } catch (error) {
    console.error('Error al crear líneas de gasto en batch:', error)
    return NextResponse.json({ error: 'Error al crear líneas de gasto' }, { status: 500 })
  }
}
