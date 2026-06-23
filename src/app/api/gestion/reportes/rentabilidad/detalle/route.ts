import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const proyectoId = searchParams.get('proyectoId')
  const categoria = searchParams.get('categoria') as 'equipos' | 'servicios' | 'gastos' | null

  if (!proyectoId || !categoria) {
    return NextResponse.json({ error: 'Faltan parámetros proyectoId y categoria' }, { status: 400 })
  }

  if (categoria === 'equipos') {
    const ocs = await prisma.ordenCompra.findMany({
      where: {
        proyectoId,
        estado: { notIn: ['cancelada', 'borrador'] },
      },
      select: {
        id: true,
        numero: true,
        estado: true,
        moneda: true,
        subtotal: true,
        igv: true,
        total: true,
        fechaEmision: true,
        observaciones: true,
        proveedor: { select: { id: true, nombre: true, ruc: true } },
        items: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            unidad: true,
            cantidad: true,
            precioUnitario: true,
            costoTotal: true,
            cantidadRecibida: true,
          },
        },
      },
      orderBy: { fechaEmision: 'desc' },
    })
    return NextResponse.json({ categoria: 'equipos', data: ocs })
  }

  if (categoria === 'servicios') {
    const registros = await prisma.registroHoras.findMany({
      where: { proyectoId, aprobado: true },
      select: {
        id: true,
        usuarioId: true,
        recursoNombre: true,
        fechaTrabajo: true,
        horasTrabajadas: true,
        costoHora: true,
        descripcion: true,
        nombreServicio: true,
        origen: true,
        user: { select: { name: true } },
        proyectoEdt: { select: { nombre: true } },
      },
      orderBy: [{ usuarioId: 'asc' }, { fechaTrabajo: 'asc' }],
    })

    // Agrupar por usuario
    const porUsuario = new Map<string, {
      usuarioId: string
      nombre: string
      totalHoras: number
      costoTotal: number
      registros: typeof registros
    }>()

    for (const r of registros) {
      const nombre = r.user?.name || r.recursoNombre
      if (!porUsuario.has(r.usuarioId)) {
        porUsuario.set(r.usuarioId, {
          usuarioId: r.usuarioId,
          nombre,
          totalHoras: 0,
          costoTotal: 0,
          registros: [],
        })
      }
      const entry = porUsuario.get(r.usuarioId)!
      entry.totalHoras += r.horasTrabajadas
      entry.costoTotal += r.horasTrabajadas * (r.costoHora ?? 0)
      entry.registros.push(r)
    }

    return NextResponse.json({
      categoria: 'servicios',
      data: Array.from(porUsuario.values()).sort((a, b) => b.totalHoras - a.totalHoras),
    })
  }

  if (categoria === 'gastos') {
    const hojas = await prisma.hojaDeGastos.findMany({
      where: {
        proyectoId,
        estado: { in: ['validado', 'cerrado'] },
      },
      select: {
        id: true,
        numero: true,
        motivo: true,
        estado: true,
        montoGastado: true,
        fechaValidacion: true,
        empleado: { select: { name: true } },
        lineas: {
          select: {
            id: true,
            descripcion: true,
            fecha: true,
            monto: true,
            moneda: true,
            tipoComprobante: true,
            numeroComprobante: true,
            proveedorNombre: true,
            categoriaGasto: { select: { nombre: true } },
          },
          orderBy: { fecha: 'asc' },
        },
      },
      orderBy: { fechaValidacion: 'desc' },
    })
    return NextResponse.json({ categoria: 'gastos', data: hojas })
  }

  return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
}
