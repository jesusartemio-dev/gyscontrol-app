import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { estadoEvidenciaAvanceEnum } from '@/lib/validators/evidenciaAvance'
import { ROLES_PERMITIDOS, ROLES_LECTURA } from '@/lib/auth/rolesEvidenciaProyecto'
import type { Prisma } from '@prisma/client'

/**
 * GET /api/proyectos/evidencias/rango?fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD[&proyectoId=][&estado=]
 *
 * Vista día a día: una entrada por cada jornada de campo del rango (con o sin
 * evidencia), a diferencia de GET /api/proyectos/evidencias que solo lista
 * las EvidenciaAvance ya creadas. Con esto el frontend puede mostrar, junto a
 * las jornadas con evidencia, cuáles todavía no tienen ("posibles
 * evidencias") con un acceso directo para abrirlas.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_LECTURA))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId') ?? undefined
    const fechaDesdeParam = searchParams.get('fechaDesde')
    const fechaHastaParam = searchParams.get('fechaHasta')
    const estadoParam = searchParams.get('estado')

    if (!fechaDesdeParam || !fechaHastaParam) {
      return NextResponse.json({ error: 'fechaDesde y fechaHasta son requeridos' }, { status: 400 })
    }

    const fechaDesde = new Date(`${fechaDesdeParam}T00:00:00Z`)
    const fechaHasta = new Date(`${fechaHastaParam}T23:59:59.999Z`)
    if (Number.isNaN(fechaDesde.getTime()) || Number.isNaN(fechaHasta.getTime()) || fechaDesde > fechaHasta) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const estadoFiltro = estadoParam ? estadoEvidenciaAvanceEnum.safeParse(estadoParam) : null

    const where: Prisma.RegistroHorasCampoWhereInput = {
      fechaTrabajo: { gte: fechaDesde, lte: fechaHasta },
    }
    if (proyectoId) where.proyectoId = proyectoId

    const jornadas = await prisma.registroHorasCampo.findMany({
      where,
      select: {
        id: true,
        fechaTrabajo: true,
        estado: true,
        ubicacion: true,
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        supervisor: { select: { id: true, name: true } },
        evidenciaAvance: {
          select: {
            id: true,
            estado: true,
            observaciones: true,
            fechaCierre: true,
            createdAt: true,
            updatedAt: true,
            creadoPor: { select: { id: true, name: true } },
            registros: { select: { id: true, tipo: true, _count: { select: { fotos: true } } } },
          },
        },
      },
      orderBy: { fechaTrabajo: 'desc' },
      take: 300,
    })

    let resultado = jornadas.map((j) => {
      let evidencia = null as null | {
        id: string
        estado: string
        observaciones: string | null
        fechaCierre: Date | null
        createdAt: Date
        updatedAt: Date
        creadoPor: { id: string; name: string | null }
        registrosCount: number
        fotosCount: number
        tipoCount: Record<string, number>
      }

      if (j.evidenciaAvance) {
        const tipoCount: Record<string, number> = {}
        let fotosCount = 0
        for (const r of j.evidenciaAvance.registros) {
          tipoCount[r.tipo] = (tipoCount[r.tipo] ?? 0) + 1
          fotosCount += r._count.fotos
        }
        evidencia = {
          id: j.evidenciaAvance.id,
          estado: j.evidenciaAvance.estado,
          observaciones: j.evidenciaAvance.observaciones,
          fechaCierre: j.evidenciaAvance.fechaCierre,
          createdAt: j.evidenciaAvance.createdAt,
          updatedAt: j.evidenciaAvance.updatedAt,
          creadoPor: j.evidenciaAvance.creadoPor,
          registrosCount: j.evidenciaAvance.registros.length,
          fotosCount,
          tipoCount,
        }
      }

      return {
        jornada: {
          id: j.id,
          fechaTrabajo: j.fechaTrabajo,
          estado: j.estado,
          ubicacion: j.ubicacion,
          proyecto: j.proyecto,
          supervisor: j.supervisor,
        },
        evidencia,
      }
    })

    // Con filtro de estado activo, solo aplica a jornadas que sí tienen
    // evidencia — las que no tienen ninguna se ocultan (no calzan "abierta"/"cerrada").
    if (estadoFiltro?.success) {
      resultado = resultado.filter((r) => r.evidencia?.estado === estadoFiltro.data)
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[GET /api/proyectos/evidencias/rango]', error)
    return NextResponse.json({ error: 'Error al listar jornadas' }, { status: 500 })
  }
}
