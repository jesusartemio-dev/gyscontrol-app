import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { procesarDesembolsoFactoring } from '@/lib/services/factoringCobro'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']
const r2 = (n: number) => Math.round(n * 100) / 100
// El reparto manual arrastra centavos de redondeo; más de eso es un error real.
const TOLERANCIA = 0.05

const FacturaSchema = z.object({
  cuentaPorCobrarId: z.string().min(1),
  // Por factura — vienen del Detalle de Liquidación
  detraccionPct: z.number().min(0).max(100).nullable().optional(),
  detraccionMonto: z.number().min(0).nullable().optional(),
  excedentePct: z.number().min(0).max(100).nullable().optional(),
  excedenteMonto: z.number().min(0).nullable().optional(),
  valorAFinanciar: z.number().min(0),
  interesMonto: z.number().min(0),
  diasFinanciamiento: z.number().int().min(0).nullable().optional(),
  fechaVencimiento: z.string().nullable().optional(),
  // Repartidos a mano desde el total de la operación
  comisionEstructuracion: z.number().min(0),
  gastosAdicionales: z.number().min(0),
  igvGastos: z.number().min(0),
  adelantoBanpro: z.number().min(0),
})

const Schema = z.object({
  numeroOperacion: z.string().min(1),
  financiera: z.string().nullable().optional(),
  fechaDesembolso: z.string().min(1),
  // Totales de la operación: contra estos se valida el reparto.
  totales: z.object({
    comisionEstructuracion: z.number().min(0),
    gastosAdicionales: z.number().min(0),
    igvGastos: z.number().min(0),
    adelantoBanpro: z.number().min(0),
  }),
  facturas: z.array(FacturaSchema).min(1),
})

// POST /api/administracion/operaciones-factoring/aplicar
//
// Registra de una vez todas las facturas de una operación de factoring, con
// los valores del Detalle de Liquidación.
//
// Comisión, gastos, IGV y adelanto los cobra la financiera por la operación
// completa —el adelanto es un solo depósito— y Administración los reparte a
// mano entre las facturas. Acá se valida que ese reparto sume exactamente los
// totales del documento: si no cuadra, no se escribe nada. Ese descuadre es
// justo lo que dejó dos de las tres facturas de la 52104 sin registrar.
//
// Cada factura se crea con el mismo servicio que usa el formulario
// (procesarDesembolsoFactoring), así que genera su PagoCobro del adelanto, el
// del costo de financiamiento y sus eventos del Cronograma. Todo en una sola
// transacción: o entran todas o no entra ninguna.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const data = Schema.parse(await request.json())

    // ── El reparto tiene que sumar los totales de la operación ──
    const suma = (f: (x: z.infer<typeof FacturaSchema>) => number) => r2(data.facturas.reduce((a, x) => a + f(x), 0))
    const descuadres: string[] = []
    const chequear = (etiqueta: string, sumado: number, total: number) => {
      if (Math.abs(sumado - total) > TOLERANCIA) {
        descuadres.push(`${etiqueta}: el reparto suma ${sumado.toFixed(2)} y el documento dice ${total.toFixed(2)}`)
      }
    }
    chequear('Comisión', suma(f => f.comisionEstructuracion), data.totales.comisionEstructuracion)
    chequear('Gastos', suma(f => f.gastosAdicionales), data.totales.gastosAdicionales)
    chequear('IGV', suma(f => f.igvGastos), data.totales.igvGastos)
    chequear('Adelanto', suma(f => f.adelantoBanpro), data.totales.adelantoBanpro)
    if (descuadres.length > 0) {
      return NextResponse.json(
        { error: 'El reparto no cuadra con los totales de la operación', descuadres },
        { status: 400 }
      )
    }

    // ── Las CxC tienen que existir, tener valorización y no tener cobro ──
    const cuentas = await prisma.cuentaPorCobrar.findMany({
      where: { id: { in: data.facturas.map(f => f.cuentaPorCobrarId) } },
      select: {
        id: true, numeroDocumento: true,
        valorizacion: { select: { id: true, cobro: { select: { id: true } } } },
      },
    })
    const porId = new Map(cuentas.map(c => [c.id, c]))
    const problemas: string[] = []
    for (const f of data.facturas) {
      const c = porId.get(f.cuentaPorCobrarId)
      if (!c) { problemas.push(`No existe la cuenta por cobrar ${f.cuentaPorCobrarId}`); continue }
      if (!c.valorizacion) { problemas.push(`${c.numeroDocumento}: no tiene valorización asociada`); continue }
      if (c.valorizacion.cobro) problemas.push(`${c.numeroDocumento}: ya tiene un cobro registrado`)
    }
    if (problemas.length > 0) {
      return NextResponse.json({ error: 'No se puede aplicar', descuadres: problemas }, { status: 400 })
    }

    const creados = await prisma.$transaction(async tx => {
      const out: { cuentaPorCobrarId: string; numeroDocumento: string | null; cobroId: string }[] = []
      for (const f of data.facturas) {
        const c = porId.get(f.cuentaPorCobrarId)!
        const totalCostos = r2(f.interesMonto + f.comisionEstructuracion + f.gastosAdicionales + f.igvGastos)
        const montoADesembolsar = r2(f.valorAFinanciar - totalCostos)

        const cobro = await tx.cobroValorizacion.create({
          data: {
            valorizacionId: c.valorizacion!.id,
            tipo: 'factoring',
            financiera: data.financiera ?? null,
            numeroOperacion: data.numeroOperacion,
            numeroDocumentos: data.facturas.length,
            fechaDesembolso: new Date(data.fechaDesembolso),
            fechaVencimiento: f.fechaVencimiento ? new Date(f.fechaVencimiento) : null,
            diasFinanciamiento: f.diasFinanciamiento ?? null,
            detraccionPct: f.detraccionPct ?? null,
            detraccionMonto: f.detraccionMonto ?? null,
            excedentePct: f.excedentePct ?? null,
            excedenteMonto: f.excedenteMonto ?? null,
            valorAFinanciar: f.valorAFinanciar,
            interesMonto: f.interesMonto,
            comisionEstructuracion: f.comisionEstructuracion,
            gastosAdicionales: f.gastosAdicionales,
            igvGastos: f.igvGastos,
            montoADesembolsar,
            adelantoBanpro: f.adelantoBanpro,
            saldoAGirar: r2(montoADesembolsar - f.adelantoBanpro),
            updatedAt: new Date(),
          },
        })
        // Mismo camino que el formulario: pagos + eventos del Cronograma.
        await procesarDesembolsoFactoring(cobro.id, tx)
        // La detracción es dato de la factura, se refleja también en la CxC.
        if (f.detraccionMonto != null) {
          await tx.cuentaPorCobrar.update({
            where: { id: c.id },
            data: { detraccionPct: f.detraccionPct ?? null, detraccionMonto: f.detraccionMonto, updatedAt: new Date() },
          })
        }
        out.push({ cuentaPorCobrarId: c.id, numeroDocumento: c.numeroDocumento, cobroId: cobro.id })
      }
      return out
    })

    return NextResponse.json({ numeroOperacion: data.numeroOperacion, registradas: creados.length, facturas: creados })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalle: error.issues }, { status: 400 })
    }
    console.error('[POST /operaciones-factoring/aplicar]', error)
    const message = error instanceof Error ? error.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
