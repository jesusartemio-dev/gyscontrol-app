import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { revertirAbonoFactoringRecibido } from '@/lib/services/factoringCobro'

type Ctx = { params: Promise<{ id: string; valId: string; abonoId: string }> }

// Mismos roles que ya editan/anulan una CxC — salvo el excedente (ver abajo).
const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']
// El excedente revertido puede bajar Valorizacion de 'pagada' a 'facturada' —
// esa transición manual ya está restringida a admin/gerente (sin
// 'administracion') en valorizaciones/[valId]/route.ts. No debe existir un
// camino indirecto (revertir el excedente) que logre lo mismo que la acción
// directa restringida — misma regla en los dos caminos.
const ROLES_ALLOWED_EXCEDENTE = ['admin', 'gerente']

const RevertirSchema = z.object({
  motivo: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres'),
})

// POST /api/proyectos/:id/valorizaciones/:valId/cobro/abonos/:abonoId/revertir
// Revierte (Sub-fase E, Caso 2) un "cobro esperado" ya marcado recibido — ej.
// se marcó con el monto equivocado. Anula el PagoCobro real (y su hermano de
// ajuste por mora, si existió), y el abono vuelve a 'pendiente'. Si es
// 'excedente', además revierte el cierre de la operación (CobroValorizacion
// vuelve a 'desembolsada') y el downgrade de Valorizacion si correspondía.
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { valId, abonoId } = await params
    const body = await request.json()
    const data = RevertirSchema.parse(body)

    const cobro = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: valId } })
    if (!cobro) {
      return NextResponse.json({ error: 'No existe una operación de cobro para esta valorización' }, { status: 404 })
    }

    const abonoExistente = await prisma.abonoValorizacion.findUnique({ where: { id: abonoId } })
    if (!abonoExistente || abonoExistente.cobroId !== cobro.id) {
      return NextResponse.json({ error: 'El cobro esperado no pertenece a esta operación' }, { status: 404 })
    }

    const rolesRequeridos = abonoExistente.tipo === 'excedente' ? ROLES_ALLOWED_EXCEDENTE : ROLES_ALLOWED
    if (!tieneRol(session, rolesRequeridos)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const abono = await prisma.$transaction(async (tx) => {
      return revertirAbonoFactoringRecibido(abonoId, data.motivo, tx)
    })

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo: 'ABONO_VALORIZACION',
        entidadId: abonoId,
        accion: 'factoring.revertir_abono',
        usuarioId: session.user.id,
        descripcion: `Cobro esperado (${abonoExistente.tipo}) revertido a pendiente — ${data.motivo}`,
      },
    })

    return NextResponse.json(abono)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[POST /cobro/abonos/:abonoId/revertir]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
