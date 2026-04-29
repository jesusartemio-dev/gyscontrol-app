import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/seguridad/reportes/por-imputacion?desde&hasta
 * Reporte de costo de EPPs entregados, agrupado por proyecto y por centro
 * de costo (usando la imputación informativa de la EntregaEPP).
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const desdeParam = searchParams.get('desde')
    const hastaParam = searchParams.get('hasta')
    const hasta = hastaParam ? new Date(hastaParam) : new Date()
    const desde = desdeParam
      ? new Date(desdeParam)
      : new Date(hasta.getFullYear(), hasta.getMonth() - 11, 1)

    const items = await prisma.entregaEPPItem.findMany({
      where: { fechaEntrega: { gte: desde, lte: hasta } },
      select: {
        cantidad: true,
        costoUnitario: true,
        costoMoneda: true,
        entrega: {
          select: {
            proyectoId: true,
            centroCostoId: true,
            proyecto: { select: { codigo: true, nombre: true } },
            centroCosto: { select: { nombre: true } },
          },
        },
      },
    })

    type Bucket = {
      tipo: 'proyecto' | 'centro' | 'sin_imputar'
      id: string | null
      label: string
      cantidadItems: number
      cantidadTotal: number
      costoPEN: number
      costoUSD: number
    }
    const map = new Map<string, Bucket>()

    for (const it of items) {
      const e = it.entrega
      let key: string
      let bucket: Bucket
      if (e.proyectoId && e.proyecto) {
        key = `proy:${e.proyectoId}`
        bucket = map.get(key) ?? {
          tipo: 'proyecto',
          id: e.proyectoId,
          label: `${e.proyecto.codigo} — ${e.proyecto.nombre}`,
          cantidadItems: 0, cantidadTotal: 0, costoPEN: 0, costoUSD: 0,
        }
      } else if (e.centroCostoId && e.centroCosto) {
        key = `cc:${e.centroCostoId}`
        bucket = map.get(key) ?? {
          tipo: 'centro',
          id: e.centroCostoId,
          label: e.centroCosto.nombre,
          cantidadItems: 0, cantidadTotal: 0, costoPEN: 0, costoUSD: 0,
        }
      } else {
        key = 'sin_imputar'
        bucket = map.get(key) ?? {
          tipo: 'sin_imputar',
          id: null,
          label: 'Sin imputar',
          cantidadItems: 0, cantidadTotal: 0, costoPEN: 0, costoUSD: 0,
        }
      }
      bucket.cantidadItems += 1
      bucket.cantidadTotal += it.cantidad
      const costo = (it.costoUnitario ?? 0) * it.cantidad
      if (it.costoMoneda === 'USD') bucket.costoUSD += costo
      else bucket.costoPEN += costo
      map.set(key, bucket)
    }

    const buckets = Array.from(map.values()).sort((a, b) =>
      (b.costoPEN + b.costoUSD) - (a.costoPEN + a.costoUSD)
    )

    return NextResponse.json({ desde, hasta, buckets })
  } catch (error: any) {
    console.error('Error en reporte por imputación:', error)
    return NextResponse.json({ error: error?.message || 'Error en reporte' }, { status: 500 })
  }
}
