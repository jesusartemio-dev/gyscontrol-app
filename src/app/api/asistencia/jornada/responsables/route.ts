import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/asistencia/jornada/responsables?proyectoId=xxx
// Lista de personas para elegir responsable de la jornada al abrir una
// asistencia de campo. Devuelve el equipo del proyecto (personal activo + roles
// fijos) por separado del resto de usuarios, para mostrarlos agrupados.
// Accesible a cualquier usuario autenticado (cualquiera puede abrir asistencia).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const proyectoId = new URL(req.url).searchParams.get('proyectoId')

  const todos = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const equipoIds = new Set<string>()
  if (proyectoId) {
    const personal = await prisma.personalProyecto.findMany({
      where: { proyectoId, activo: true },
      select: { userId: true },
    })
    personal.forEach((p) => equipoIds.add(p.userId))

    const proy = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
    })
    if (proy) {
      ;[proy.gestorId, proy.supervisorId, proy.liderId, proy.comercialId].forEach((id) => {
        if (id) equipoIds.add(id)
      })
    }
  }

  return NextResponse.json({
    equipo: todos.filter((u) => equipoIds.has(u.id)),
    otros: todos.filter((u) => !equipoIds.has(u.id)),
  })
}
