import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generarExcelValorizacionHH } from '@/lib/utils/exportHH'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    // 1. Load ValorizacionHH with all relations needed for export
    const valHH = await prisma.valorizacionHH.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true } },
        valorizacion: {
          select: {
            id: true, codigo: true, moneda: true,
            montoValorizacion: true,
            descuentoComercialPorcentaje: true,
            descuentoComercialMonto: true,
            adelantoPorcentaje: true, adelantoMonto: true,
            subtotal: true,
            igvPorcentaje: true, igvMonto: true,
            fondoGarantiaPorcentaje: true, fondoGarantiaMonto: true,
            netoARecibir: true,
            periodoInicio: true, periodoFin: true,
          },
        },
        lineas: {
          include: {
            proyecto: { select: { id: true, codigo: true, nombre: true } },
            recurso: { select: { id: true, nombre: true } },
          },
          orderBy: [{ proyectoId: 'asc' }, { recursoId: 'asc' }, { fecha: 'asc' }],
        },
      },
    })

    if (!valHH) {
      return NextResponse.json({ error: 'Valorización HH no encontrada' }, { status: 404 })
    }

    // 2. Load tarifas and descuentos for the Costo HH sheet
    const [tarifas, descuentos] = await Promise.all([
      prisma.tarifaClienteRecurso.findMany({
        where: { clienteId: valHH.clienteId, activo: true },
        include: { recurso: { select: { nombre: true } } },
      }),
      prisma.configDescuentoHH.findMany({
        where: { clienteId: valHH.clienteId, activo: true },
        orderBy: { orden: 'asc' },
      }),
    ])

    // 3. Generate Excel
    const buffer = await generarExcelValorizacionHH({
      ...valHH,
      tarifas: tarifas.map(t => ({
        recursoId: t.recursoId,
        recursoNombre: t.recurso.nombre,
        modalidad: t.modalidad,
        tarifaVenta: t.tarifaVenta,
      })),
      descuentos: descuentos.map(d => ({
        desdeHoras: d.desdeHoras,
        descuentoPct: d.descuentoPct,
        orden: d.orden,
      })),
    })

    // 4. Build filename
    const periodoFin = new Date(valHH.periodoFin)
    const yyyy = periodoFin.getUTCFullYear()
    const mm = String(periodoFin.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(periodoFin.getUTCDate()).padStart(2, '0')
    const filename = `DEN-VALORIZACION-${yyyy}${mm}${dd}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error al exportar valorización HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
