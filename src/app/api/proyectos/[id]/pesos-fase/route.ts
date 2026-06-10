import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularPesosFase } from '@/lib/services/pesoFase'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

/**
 * GET /api/proyectos/[id]/pesos-fase
 * Pesos (sugerido por horas, manual y efectivo normalizado) y avance por fase del
 * cronograma de ejecución, más el avance global ponderado.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const resultado = await calcularPesosFase(id)
    return NextResponse.json(resultado)
  } catch (e) {
    console.error('[GET /api/proyectos/[id]/pesos-fase]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/proyectos/[id]/pesos-fase
 * Body: { pesos: [{ faseId: string, pesoManual: number | null }] }
 * Guarda el peso manual crudo por fase (null = volver al peso por horas). La normalización
 * a 100% es al calcular (GET / motor). Devuelve el resultado recalculado.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para editar pesos' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const pesos = body?.pesos
    if (!Array.isArray(pesos)) {
      return NextResponse.json({ error: 'Body inválido: se espera { pesos: [...] }' }, { status: 400 })
    }

    // Validar cada entrada: faseId string, pesoManual número >= 0 o null.
    const updates: { faseId: string; pesoManual: number | null }[] = []
    for (const p of pesos) {
      if (!p || typeof p.faseId !== 'string') {
        return NextResponse.json({ error: 'faseId inválido' }, { status: 400 })
      }
      const pm = p.pesoManual
      if (pm !== null && (typeof pm !== 'number' || !Number.isFinite(pm) || pm < 0)) {
        return NextResponse.json({ error: `pesoManual inválido para ${p.faseId}` }, { status: 400 })
      }
      updates.push({ faseId: p.faseId, pesoManual: pm })
    }

    // Solo fases que pertenezcan a este proyecto (evita edición cruzada).
    const fasesValidas = await prisma.proyectoFase.findMany({
      where: { proyectoId: id, id: { in: updates.map((u) => u.faseId) } },
      select: { id: true },
    })
    const idsValidos = new Set(fasesValidas.map((f) => f.id))

    await prisma.$transaction(
      updates
        .filter((u) => idsValidos.has(u.faseId))
        .map((u) =>
          prisma.proyectoFase.update({
            where: { id: u.faseId },
            data: { pesoManual: u.pesoManual, updatedAt: new Date() },
          }),
        ),
    )

    const resultado = await calcularPesosFase(id)
    return NextResponse.json(resultado)
  } catch (e) {
    console.error('[PATCH /api/proyectos/[id]/pesos-fase]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
