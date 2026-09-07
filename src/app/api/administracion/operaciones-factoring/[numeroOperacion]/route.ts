import { tieneRol } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const r2 = (n: number) => Math.round(n * 100) / 100

// GET /api/administracion/operaciones-factoring/:numeroOperacion
//
// Una operación de factoring puede cubrir VARIAS facturas — y hasta de
// clientes distintos (la 52104 mezcla QROMA y NEXA). BANPRO cobra comisión,
// gastos e IGV y gira el adelanto a nivel de OPERACIÓN, en un solo depósito;
// Administración reparte esos importes entre las facturas a mano, porque el
// cobro se registra por comprobante.
//
// El modelo guarda un cobro por factura (que es lo correcto: cada CxC tiene su
// saldo y su cronograma), así que la operación solo existe como el
// numeroOperacion repetido. Este endpoint la reconstruye para poder verla
// completa y, sobre todo, para detectar los dos errores que trae el reparto
// manual: que las partes no sumen el total de BANPRO, y que falten facturas
// por registrar.
export async function GET(_req: Request, { params }: { params: Promise<{ numeroOperacion: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { numeroOperacion: raw } = await params
    const numeroOperacion = decodeURIComponent(raw).trim()
    if (!numeroOperacion) return NextResponse.json({ error: 'N° de operación requerido' }, { status: 400 })

    const cobros = await prisma.cobroValorizacion.findMany({
      where: { numeroOperacion },
      include: {
        valorizacion: {
          select: {
            id: true, codigo: true,
            proyecto: { select: { id: true, codigo: true } },
            cuentasPorCobrar: {
              select: { id: true, numeroDocumento: true, monto: true, moneda: true, estado: true,
                        cliente: { select: { nombre: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (cobros.length === 0) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    const facturas = cobros.map(c => {
      const cta = c.valorizacion?.cuentasPorCobrar?.[0] ?? null
      return {
        cobroId: c.id,
        cuentaPorCobrarId: cta?.id ?? null,
        numeroDocumento: cta?.numeroDocumento ?? null,
        cliente: cta?.cliente?.nombre ?? null,
        proyecto: c.valorizacion?.proyecto?.codigo ?? null,
        moneda: cta?.moneda ?? 'PEN',
        estadoCxC: cta?.estado ?? null,
        montoFactura: cta?.monto ?? null,
        // Por factura — BANPRO los da en el Detalle de Liquidación
        detraccionMonto: c.detraccionMonto,
        valorAFinanciar: c.valorAFinanciar,
        excedenteMonto: c.excedenteMonto,
        interesMonto: c.interesMonto,
        // Repartidos a mano desde el total de la operación
        comisionEstructuracion: c.comisionEstructuracion,
        gastosAdicionales: c.gastosAdicionales,
        igvGastos: c.igvGastos,
        adelantoBanpro: c.adelantoBanpro,
        saldoAGirar: c.saldoAGirar,
        estadoCobro: c.estado,
      }
    })

    const suma = (f: (x: typeof facturas[number]) => number | null | undefined) =>
      r2(facturas.reduce((acc, x) => acc + (f(x) ?? 0), 0))

    // BANPRO declara cuántos documentos entraron en la operación. Si hay menos
    // cobros registrados, faltan facturas por cargar — y esas CxC están
    // figurando con saldo completo aunque ya se adelantó dinero contra ellas.
    const documentosDeclarados = cobros.find(c => c.numeroDocumentos != null)?.numeroDocumentos ?? null
    const facturasFaltantes = documentosDeclarados != null
      ? Math.max(0, documentosDeclarados - facturas.length)
      : null

    // Una operación no debería mezclar financieras ni monedas.
    const financieras = Array.from(new Set(cobros.map(c => c.financiera).filter(Boolean))) as string[]
    const monedas = Array.from(new Set(facturas.map(f => f.moneda)))

    return NextResponse.json({
      numeroOperacion,
      financiera: financieras[0] ?? null,
      financierasDistintas: financieras.length > 1 ? financieras : null,
      monedasDistintas: monedas.length > 1 ? monedas : null,
      documentosDeclarados,
      facturasRegistradas: facturas.length,
      facturasFaltantes,
      facturas,
      totales: {
        montoFactura: suma(f => f.montoFactura),
        detraccionMonto: suma(f => f.detraccionMonto),
        valorAFinanciar: suma(f => f.valorAFinanciar),
        excedenteMonto: suma(f => f.excedenteMonto),
        interesMonto: suma(f => f.interesMonto),
        comisionEstructuracion: suma(f => f.comisionEstructuracion),
        gastosAdicionales: suma(f => f.gastosAdicionales),
        igvGastos: suma(f => f.igvGastos),
        adelantoBanpro: suma(f => f.adelantoBanpro),
        saldoAGirar: suma(f => f.saldoAGirar),
      },
    })
  } catch (error) {
    console.error('[GET /operaciones-factoring/:numeroOperacion]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
