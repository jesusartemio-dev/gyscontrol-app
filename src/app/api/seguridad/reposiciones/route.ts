import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/seguridad/reposiciones
 * Lista items de entregas EPP cuyo fechaReposicionEstimada está próxima a vencer
 * o ya vencida. Solo items en estado 'vigente'.
 *
 * Query params:
 *  - dias: ventana hacia adelante en días (default 30 — items que vencen dentro de 30 días)
 *  - empleadoId: filtrar por empleado
 *  - subcategoria: filtrar por subcategoría EPP
 *  - vencidos: 'true' = solo los que ya vencieron
 *
 * Devuelve los items ordenados por fechaReposicionEstimada ascendente
 * (los más urgentes primero).
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
    const diasParam = searchParams.get('dias')
    const dias = diasParam ? Math.max(0, parseInt(diasParam) || 30) : 30
    const empleadoId = searchParams.get('empleadoId')
    const subcategoria = searchParams.get('subcategoria')
    const soloVencidos = searchParams.get('vencidos') === 'true'

    const ahora = new Date()
    const limite = new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000)

    const where: any = {
      estado: 'vigente',
      fechaReposicionEstimada: soloVencidos
        ? { lt: ahora }
        : { lte: limite, not: null },
    }
    if (empleadoId) where.entrega = { empleadoId }
    if (subcategoria) where.catalogoEpp = { subcategoria }

    const items = await prisma.entregaEPPItem.findMany({
      where,
      include: {
        catalogoEpp: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            marca: true,
            subcategoria: true,
            unidad: { select: { nombre: true } },
          },
        },
        entrega: {
          select: {
            id: true,
            numero: true,
            fechaEntrega: true,
            empleado: {
              select: {
                id: true,
                documentoIdentidad: true,
                cargo: { select: { nombre: true } },
                departamento: { select: { nombre: true } },
                user: { select: { name: true } },
              },
            },
            proyecto: { select: { codigo: true } },
            centroCosto: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fechaReposicionEstimada: 'asc' },
      take: 500,
    })

    // Etiquetar urgencia para conveniencia del frontend
    const enriched = items.map(item => {
      const fecha = item.fechaReposicionEstimada!
      const diasRestantes = Math.ceil((fecha.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000))
      let urgencia: 'vencido' | 'critico' | 'proximo' | 'normal'
      if (diasRestantes < 0) urgencia = 'vencido'
      else if (diasRestantes <= 7) urgencia = 'critico'
      else if (diasRestantes <= 30) urgencia = 'proximo'
      else urgencia = 'normal'
      return { ...item, diasRestantes, urgencia }
    })

    // Conteos de resumen
    const resumen = {
      vencidos: enriched.filter(i => i.urgencia === 'vencido').length,
      criticos: enriched.filter(i => i.urgencia === 'critico').length,
      proximos: enriched.filter(i => i.urgencia === 'proximo').length,
      total: enriched.length,
    }

    return NextResponse.json({ items: enriched, resumen })
  } catch (error: any) {
    console.error('Error al obtener reposiciones:', error)
    return NextResponse.json({ error: error?.message || 'Error al obtener reposiciones' }, { status: 500 })
  }
}
