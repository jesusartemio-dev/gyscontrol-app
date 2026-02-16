import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'logistico']

async function generarNumeroOC(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `OC-${yy}${mm}${dd}`

  const ultimo = await prisma.ordenCompra.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

interface ImportItem {
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
}

interface ImportOrden {
  proveedorId: string
  proyectoId: string | null
  centroCostoId: string | null
  categoriaCosto: string
  moneda: string
  condicionPago: string
  lugarEntrega: string | null
  observaciones: string | null
  items: ImportItem[]
}

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
    const { ordenes } = body as { ordenes: ImportOrden[] }

    if (!Array.isArray(ordenes) || ordenes.length === 0) {
      return NextResponse.json({ error: 'No hay órdenes para importar' }, { status: 400 })
    }

    if (ordenes.length > 50) {
      return NextResponse.json({ error: 'Máximo 50 órdenes por importación' }, { status: 400 })
    }

    let creadas = 0
    const errores: string[] = []

    for (let i = 0; i < ordenes.length; i++) {
      const oc = ordenes[i]
      try {
        if (!oc.proveedorId) {
          errores.push(`OC ${i + 1}: proveedorId requerido`)
          continue
        }
        if (!oc.items || oc.items.length === 0) {
          errores.push(`OC ${i + 1}: debe tener al menos un item`)
          continue
        }
        if (!oc.proyectoId && !oc.centroCostoId) {
          errores.push(`OC ${i + 1}: requiere proyecto o centro de costo`)
          continue
        }

        const numero = await generarNumeroOC()

        const items = oc.items.map(item => ({
          codigo: item.codigo,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          costoTotal: item.cantidad * item.precioUnitario,
          updatedAt: new Date(),
        }))

        const subtotal = items.reduce((sum, it) => sum + it.costoTotal, 0)
        const igv = oc.moneda === 'USD' ? 0 : subtotal * 0.18
        const total = subtotal + igv

        await prisma.ordenCompra.create({
          data: {
            numero,
            proveedorId: oc.proveedorId,
            proyectoId: oc.proyectoId || null,
            centroCostoId: oc.centroCostoId || null,
            categoriaCosto: (oc.categoriaCosto || 'equipos') as any,
            solicitanteId: session.user.id,
            condicionPago: oc.condicionPago || 'contado',
            moneda: oc.moneda || 'PEN',
            subtotal,
            igv,
            total,
            lugarEntrega: oc.lugarEntrega || null,
            observaciones: oc.observaciones || null,
            updatedAt: new Date(),
            items: {
              create: items,
            },
          },
        })
        creadas++
      } catch (err: any) {
        errores.push(`OC ${i + 1}: ${err.message}`)
      }
    }

    return NextResponse.json({
      creadas,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error) {
    console.error('Error al importar OCs:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
