import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'administracion']

const AjusteSchema = z.object({
  userId: z.string().min(1),
  tipoAusenciaId: z.string().min(1),
  anio: z.number().int().min(2020).max(2100),
  dias: z.number(),
  motivo: z.string().min(1, 'El motivo es requerido').max(300),
})

// PATCH /api/saldos-ausencia/ajuste — crea o ajusta un saldo
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_ADMIN.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = AjusteSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      let saldo = await tx.saldoAusencia.findUnique({
        where: {
          userId_tipoAusenciaId_anio: {
            userId: data.userId,
            tipoAusenciaId: data.tipoAusenciaId,
            anio: data.anio,
          },
        },
      })

      if (!saldo) {
        saldo = await tx.saldoAusencia.create({
          data: {
            userId: data.userId,
            tipoAusenciaId: data.tipoAusenciaId,
            anio: data.anio,
            diasAsignados: 0,
            diasGozados: 0,
            diasPendientes: 0,
            diasDisponibles: 0,
            updatedAt: new Date(),
          },
        })
      }

      const nuevosAsignados = saldo.diasAsignados + data.dias
      const nuevosDisponibles = nuevosAsignados - saldo.diasGozados - saldo.diasPendientes

      const updated = await tx.saldoAusencia.update({
        where: { id: saldo.id },
        data: {
          diasAsignados: nuevosAsignados,
          diasDisponibles: Math.max(0, nuevosDisponibles),
          updatedAt: new Date(),
        },
      })

      await tx.movimientoSaldoAusencia.create({
        data: {
          saldoId: saldo.id,
          tipo: 'ajuste_manual',
          dias: data.dias,
          motivo: data.motivo,
          creadoPorId: session.user.id,
        },
      })

      return updated
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[PATCH /api/saldos-ausencia/ajuste]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
