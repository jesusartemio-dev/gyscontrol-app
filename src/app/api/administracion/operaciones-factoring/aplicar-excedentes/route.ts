import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const Schema = z.object({
  cierres: z.array(z.object({
    cobroId: z.string().min(1),
    // Con signo, como los manda la financiera.
    mora: z.number().nullable().optional(),
    comisionInteres: z.number().nullable().optional(),
    diferencia: z.number().nullable().optional(),
    otros: z.number().nullable().optional(),
    fechaRecaudacion: z.string().nullable().optional(),
  })).min(1),
})

// POST /api/administracion/operaciones-factoring/aplicar-excedentes
//
// Guarda el cierre que manda la financiera en el Informe de Excedentes: el
// desglose de por qué el excedente que devuelve no es el que se retuvo.
//
// NO marca el evento como recibido a propósito. El informe dice cuánto va a
// devolver, no que ya lo haya depositado — eso lo confirma Administración
// desde el Cronograma cuando entra la plata, y ahí el Total Excedente ya
// aparece calculado.
//
// Tampoco toca el montoEsperado del evento: sigue siendo el excedente
// original. Si se cambiara por el total, la diferencia (la mora) nunca
// generaría su ajuste al confirmar y el saldo de la CxC no cerraría.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { cierres } = Schema.parse(await request.json())

    const existentes = await prisma.cobroValorizacion.findMany({
      where: { id: { in: cierres.map(c => c.cobroId) } },
      select: { id: true, tipo: true },
    })
    const porId = new Map(existentes.map(c => [c.id, c]))
    const problemas = cierres
      .filter(c => !porId.has(c.cobroId) || porId.get(c.cobroId)!.tipo !== 'factoring')
      .map(c => `El cobro ${c.cobroId} no existe o no es factoring`)
    if (problemas.length > 0) {
      return NextResponse.json({ error: 'No se puede aplicar', descuadres: problemas }, { status: 400 })
    }

    const actualizados = await prisma.$transaction(
      cierres.map(c => prisma.cobroValorizacion.update({
        where: { id: c.cobroId },
        data: {
          mora: c.mora ?? null,
          comisionInteres: c.comisionInteres ?? null,
          diferencia: c.diferencia ?? null,
          otros: c.otros ?? null,
          // Cuándo pagó el cliente de verdad. Es el dato que dispara la
          // liberación del excedente y que hasta ahora quedaba vacío.
          ...(c.fechaRecaudacion ? { fechaConfirmacion: new Date(c.fechaRecaudacion) } : {}),
        },
        select: { id: true, numeroOperacion: true },
      }))
    )

    return NextResponse.json({ cerradas: actualizados.length, cobros: actualizados })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', detalle: error.issues }, { status: 400 })
    }
    console.error('[POST /operaciones-factoring/aplicar-excedentes]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
