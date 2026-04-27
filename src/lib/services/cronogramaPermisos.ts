import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Roles autorizados para modificar cronogramas de planificación y ejecución.
 * Los cronogramas tipo `comercial` son de solo lectura (se generan desde la cotización).
 */
export const ROLES_CRONOGRAMA = ['admin', 'gerente', 'gestor', 'coordinador'] as const

interface ValidacionExitosa {
  ok: true
  userId: string
  role: string
  cronogramaId: string
  cronogramaTipo: string
  proyectoId: string
}

interface ValidacionError {
  ok: false
  response: NextResponse
}

type ResultadoValidacion = ValidacionExitosa | ValidacionError

/**
 * Valida si el usuario actual puede modificar un cronograma.
 *
 * Reglas:
 * 1. Debe estar autenticado.
 * 2. Su rol debe estar en ROLES_CRONOGRAMA.
 * 3. El cronograma NO debe ser de tipo `comercial` (esos son solo lectura).
 * 4. El cronograma no debe estar bloqueado (a menos que se pase ignoreBloqueo).
 */
export async function validarPermisoCronograma(
  cronogramaId: string,
  options: { ignoreBloqueo?: boolean } = {}
): Promise<ResultadoValidacion> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  if (!ROLES_CRONOGRAMA.includes(session.user.role as any)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sin permisos para modificar cronogramas. Solo admin, gerente, gestor y coordinador pueden hacerlo.' },
        { status: 403 }
      ),
    }
  }

  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { id: cronogramaId },
    select: { id: true, tipo: true, proyectoId: true, bloqueado: true },
  })

  if (!cronograma) {
    return { ok: false, response: NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 }) }
  }

  if (cronograma.tipo === 'comercial') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'El cronograma comercial es de solo lectura (se genera desde la cotización).' },
        { status: 403 }
      ),
    }
  }

  if (cronograma.bloqueado && !options.ignoreBloqueo) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'El cronograma está bloqueado. Desbloquéelo antes de editarlo.' },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    userId: session.user.id,
    role: session.user.role,
    cronogramaId: cronograma.id,
    cronogramaTipo: cronograma.tipo,
    proyectoId: cronograma.proyectoId,
  }
}

/**
 * Variante para casos donde tenemos un EDT y necesitamos averiguar su cronograma.
 */
export async function validarPermisoCronogramaPorEdt(edtId: string): Promise<ResultadoValidacion> {
  const edt = await prisma.proyectoEdt.findUnique({
    where: { id: edtId },
    select: { proyectoCronogramaId: true },
  })
  if (!edt) {
    return { ok: false, response: NextResponse.json({ error: 'EDT no encontrado' }, { status: 404 }) }
  }
  return validarPermisoCronograma(edt.proyectoCronogramaId)
}

/**
 * Variante para casos donde tenemos una tarea y necesitamos averiguar su cronograma.
 */
export async function validarPermisoCronogramaPorTarea(tareaId: string): Promise<ResultadoValidacion> {
  const tarea = await prisma.proyectoTarea.findUnique({
    where: { id: tareaId },
    select: { proyectoCronogramaId: true },
  })
  if (!tarea) {
    return { ok: false, response: NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 }) }
  }
  return validarPermisoCronograma(tarea.proyectoCronogramaId)
}

/**
 * Variante para casos donde tenemos una fase y necesitamos averiguar su cronograma.
 */
export async function validarPermisoCronogramaPorFase(faseId: string): Promise<ResultadoValidacion> {
  const fase = await prisma.proyectoFase.findUnique({
    where: { id: faseId },
    select: { proyectoCronogramaId: true },
  })
  if (!fase) {
    return { ok: false, response: NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 }) }
  }
  return validarPermisoCronograma(fase.proyectoCronogramaId)
}

/**
 * Variante para casos donde tenemos una actividad y necesitamos averiguar su cronograma.
 */
export async function validarPermisoCronogramaPorActividad(actividadId: string): Promise<ResultadoValidacion> {
  const act = await prisma.proyectoActividad.findUnique({
    where: { id: actividadId },
    select: { proyectoCronogramaId: true },
  })
  if (!act) {
    return { ok: false, response: NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 }) }
  }
  return validarPermisoCronograma(act.proyectoCronogramaId)
}
