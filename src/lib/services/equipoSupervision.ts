// ===================================================
// Scope de "mi equipo" para coordinador/gestor
// ===================================================
//
// No existe un rol de "coordinador de proyecto" con FK propia en el schema
// (a diferencia de `gestor`, que sí es dueño real vía Proyecto.gestorId) —
// el vínculo coordinador↔proyecto se registra en PersonalProyecto
// (RolPersonalProyecto incluye 'coordinador'). Este módulo centraliza esa
// regla para no reimplementarla ad-hoc en cada endpoint.

import { prisma } from '@/lib/prisma'

/**
 * IDs de proyecto donde este usuario tiene responsabilidad de equipo:
 * - `gestor`: proyectos donde es el gestor asignado (Proyecto.gestorId).
 * - `coordinador`: proyectos donde tiene una membresía activa en
 *   PersonalProyecto (sin importar qué `rol` tenga ahí — un coordinador
 *   puede figurar con cualquier rol de asignación en un proyecto dado).
 * Si el usuario tiene ambos roles, es la unión de los dos criterios.
 */
export async function getProyectoIdsDeMiEquipo(
  userId: string,
  roles: readonly string[],
): Promise<string[]> {
  const ids = new Set<string>()

  if (roles.includes('gestor')) {
    const proyectos = await prisma.proyecto.findMany({
      where: { gestorId: userId },
      select: { id: true },
    })
    proyectos.forEach((p) => ids.add(p.id))
  }

  if (roles.includes('coordinador')) {
    const membresias = await prisma.personalProyecto.findMany({
      where: { userId, activo: true },
      select: { proyectoId: true },
    })
    membresias.forEach((m) => ids.add(m.proyectoId))
  }

  return Array.from(ids)
}

/**
 * IDs de usuario que integran el equipo de esta persona: todo el personal
 * activo asignado a sus proyectos, más los responsables directos del
 * proyecto (gestor/supervisor/líder/comercial) — así no se excluye a quien
 * es dueño del proyecto pero no tiene fila en PersonalProyecto.
 *
 * Devuelve `[]` si el usuario no tiene ningún proyecto bajo su cargo
 * (llamador debe tratar `[]` como "sin datos", no como "sin filtro").
 */
export async function getUserIdsDeMiEquipo(
  userId: string,
  roles: readonly string[],
): Promise<string[]> {
  const proyectoIds = await getProyectoIdsDeMiEquipo(userId, roles)
  if (proyectoIds.length === 0) return []

  const [miembros, proyectos] = await Promise.all([
    prisma.personalProyecto.findMany({
      where: { proyectoId: { in: proyectoIds }, activo: true },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.proyecto.findMany({
      where: { id: { in: proyectoIds } },
      select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
    }),
  ])

  const userIds = new Set<string>()
  miembros.forEach((m) => userIds.add(m.userId))
  proyectos.forEach((p) => {
    ;[p.gestorId, p.supervisorId, p.liderId, p.comercialId].forEach((id) => {
      if (id) userIds.add(id)
    })
  })

  return Array.from(userIds)
}
