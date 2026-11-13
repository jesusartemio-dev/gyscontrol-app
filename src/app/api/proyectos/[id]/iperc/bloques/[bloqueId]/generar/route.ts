import { tieneRol } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { claveLinea } from '@/lib/iperc/construirEstructura'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { validarPreRequisitos } from '@/lib/iperc/validarPreRequisitos'
import { generarConIa } from '@/lib/iperc/generarConIa'
import { mensajeErrorIA } from '@/lib/ia/errorIA'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string; bloqueId: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

/**
 * Genera UN bloque del IPERC. Cada bloque tiene su propia petición y por
 * tanto su propio límite de 5 minutos: lo que antes se perdía al cortarse una
 * corrida de 68 tareas, ahora falla como mucho un bloque de 24 y se reintenta
 * solo ese.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: proyectoId, bloqueId } = await ctx.params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const userId = session.user.id

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const esAsignado =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId
  if (!tieneRol(session, ROLES_CON_ACCESO) && !esAsignado) {
    return Response.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  if (!(await isIAFeatureEnabled('iperc'))) {
    return Response.json({ error: 'La funcionalidad de IA para IPERC está deshabilitada' }, { status: 403 })
  }

  const prereqs = await validarPreRequisitos(proyectoId)
  if (!prereqs.cumple) {
    return Response.json({ error: 'Prerequisitos incompletos', faltantes: prereqs.faltantes }, { status: 409 })
  }

  const bloque = await prisma.ipercBloque.findUnique({
    where: { id: bloqueId },
    include: { iperc: { select: { proyectoId: true } } },
  })
  if (!bloque || bloque.iperc.proyectoId !== proyectoId) {
    return Response.json({ error: 'Bloque no encontrado en este proyecto' }, { status: 404 })
  }
  if (bloque.tareaIds.length === 0) {
    return Response.json({ error: 'El bloque no tiene tareas' }, { status: 400 })
  }

  await prisma.ipercBloque.update({
    where: { id: bloqueId },
    data: { estado: 'generando', errorMensaje: null, updatedAt: new Date() },
  })

  const encoder = new TextEncoder()
  const signal = req.signal

  const stream = new ReadableStream({
    async start(controller) {
      let cerrado = false
      const send = (event: string, data: unknown) => {
        if (cerrado) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          cerrado = true
        }
      }

      /**
       * Qué tenía que evaluar este bloque y qué quedó sin evaluar.
       *
       * Se cuenta contra la estructura revisada, no contra las tareas del
       * cronograma: al unir dos tareas, las dos apuntan a una sola línea que
       * se evalúa una vez, y eso es exactamente lo que se pidió. Contando las
       * del cronograma, un bloque con tareas unidas se marcaba como fallido
       * aunque hubiera generado todo lo que correspondía.
       */
      const cobertura = async (b: { ipercId: string; tareaIds: string[] }) => {
        const items = await prisma.ipercEstructuraItem.findMany({
          where: { ipercId: b.ipercId, origen: { not: 'fija' } },
          select: { proceso: true, actividad: true, tarea: true, tareaIds: true },
        })
        const delBloque = items.filter(i => i.tareaIds.some(t => b.tareaIds.includes(t)))

        // Sin estructura (IPERC de antes de que existiera) se cuenta como siempre.
        if (delBloque.length === 0) {
          const cubiertas = await prisma.ipercFila.findMany({
            where: { ipercId: b.ipercId, tareaCronogramaRefId: { in: b.tareaIds } },
            select: { tareaCronogramaRefId: true },
            distinct: ['tareaCronogramaRefId'],
          })
          return {
            esperadas: b.tareaIds.length,
            cubiertas: cubiertas.length,
            faltantes: Array<string>(b.tareaIds.length - cubiertas.length).fill('(tarea del cronograma)'),
          }
        }

        const filas = await prisma.ipercFila.findMany({
          where: { ipercId: b.ipercId },
          select: { proceso: true, actividad: true, tarea: true },
        })
        const conFila = new Set(filas.map(claveLinea))
        const faltantes = delBloque
          .filter(i => !conFila.has(claveLinea(i)))
          .map(i => i.tarea)

        return {
          esperadas: delBloque.length,
          cubiertas: delBloque.length - faltantes.length,
          faltantes,
        }
      }

      // El estado del bloque se decide mirando la BD, no los eventos: si la
      // función muere por timeout no llega ningún evento, y el bloque tiene
      // que quedar marcado como fallido igual.
      const cerrarBloque = async () => {
        const filas = await prisma.ipercFila.count({
          where: { ipercId: bloque.ipercId, tareaCronogramaRefId: { in: bloque.tareaIds } },
        })

        const { esperadas, cubiertas, faltantes } = await cobertura(bloque)
        const completo = faltantes.length === 0

        await prisma.ipercBloque.update({
          where: { id: bloqueId },
          data: {
            estado: completo ? 'listo' : 'fallido',
            filasGeneradas: filas,
            generadoEn: new Date(),
            errorMensaje: completo
              ? null
              : `Quedaron ${faltantes.length} de ${esperadas} tareas sin evaluar: ` +
                `${faltantes.slice(0, 3).join('; ')}` +
                `${faltantes.length > 3 ? ` y ${faltantes.length - 3} más` : ''}. Reintenta este bloque.`,
            updatedAt: new Date(),
          },
        })
        return { completo, filas, sinEvaluar: faltantes.length, esperadas, cubiertas }
      }

      try {
        await generarConIa(proyectoId, userId, bloque.edtIds, send, signal, bloque.tareaIds)
        const r = await cerrarBloque()
        send('bloque', r)
      } catch (err) {
        console.error('[iperc/bloques/generar]', err)
        const mensaje = mensajeErrorIA(err, 'Error al generar el bloque')
        await prisma.ipercBloque.update({
          where: { id: bloqueId },
          data: { estado: 'fallido', errorMensaje: mensaje, updatedAt: new Date() },
        })
        send('error', { mensaje })
      } finally {
        cerrado = true
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
