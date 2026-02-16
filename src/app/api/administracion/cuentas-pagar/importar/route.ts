import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { registros } = body

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: 'No hay registros para importar' }, { status: 400 })
    }

    if (registros.length > 500) {
      return NextResponse.json({ error: 'Máximo 500 registros por importación' }, { status: 400 })
    }

    let creados = 0
    const errores: string[] = []

    for (let i = 0; i < registros.length; i++) {
      const r = registros[i]
      try {
        if (!r.proveedorId || !r.monto || !r.fechaRecepcion || !r.fechaVencimiento) {
          errores.push(`Registro ${i + 1}: campos requeridos faltantes`)
          continue
        }

        await prisma.cuentaPorPagar.create({
          data: {
            proveedorId: r.proveedorId,
            proyectoId: r.proyectoId || null,
            ordenCompraId: null,
            numeroFactura: r.numeroFactura || null,
            descripcion: null,
            monto: r.monto,
            moneda: r.moneda || 'PEN',
            saldoPendiente: r.estado === 'pagada' ? 0 : r.monto,
            montoPagado: r.estado === 'pagada' ? r.monto : 0,
            fechaRecepcion: new Date(r.fechaRecepcion),
            fechaVencimiento: new Date(r.fechaVencimiento),
            condicionPago: r.condicionPago || 'contado',
            estado: r.estado || 'pendiente',
            observaciones: r.observaciones || null,
            updatedAt: new Date(),
          },
        })
        creados++
      } catch (err: any) {
        errores.push(`Registro ${i + 1}: ${err.message}`)
      }
    }

    return NextResponse.json({
      creados,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error) {
    console.error('Error al importar CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
