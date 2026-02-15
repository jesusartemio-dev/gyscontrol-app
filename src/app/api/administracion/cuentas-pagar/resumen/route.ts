import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const now = new Date()

    const totalPendiente = await prisma.cuentaPorPagar.aggregate({
      where: { estado: { in: ['pendiente', 'parcial'] } },
      _sum: { saldoPendiente: true },
      _count: true,
    })

    const totalVencido = await prisma.cuentaPorPagar.aggregate({
      where: {
        estado: { in: ['pendiente', 'parcial'] },
        fechaVencimiento: { lt: now },
      },
      _sum: { saldoPendiente: true },
      _count: true,
    })

    // Resumen por proveedor
    const cuentas = await prisma.cuentaPorPagar.findMany({
      where: { estado: { in: ['pendiente', 'parcial'] } },
      select: {
        proveedorId: true,
        saldoPendiente: true,
        fechaVencimiento: true,
        proveedor: { select: { id: true, nombre: true, ruc: true } },
      },
    })

    const porProveedorMap = new Map<string, { proveedor: { id: string; nombre: string; ruc: string | null }; totalPendiente: number; totalVencido: number; count: number }>()
    for (const c of cuentas) {
      const entry = porProveedorMap.get(c.proveedorId) || {
        proveedor: c.proveedor,
        totalPendiente: 0,
        totalVencido: 0,
        count: 0,
      }
      entry.totalPendiente += c.saldoPendiente
      entry.count++
      if (c.fechaVencimiento < now) {
        entry.totalVencido += c.saldoPendiente
      }
      porProveedorMap.set(c.proveedorId, entry)
    }

    return NextResponse.json({
      totalPendiente: Math.round((totalPendiente._sum.saldoPendiente || 0) * 100) / 100,
      countPendiente: totalPendiente._count,
      totalVencido: Math.round((totalVencido._sum.saldoPendiente || 0) * 100) / 100,
      countVencido: totalVencido._count,
      porProveedor: Array.from(porProveedorMap.values())
        .map(e => ({
          ...e,
          totalPendiente: Math.round(e.totalPendiente * 100) / 100,
          totalVencido: Math.round(e.totalVencido * 100) / 100,
        }))
        .sort((a, b) => b.totalPendiente - a.totalPendiente),
    })
  } catch (error) {
    console.error('Error al obtener resumen CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
