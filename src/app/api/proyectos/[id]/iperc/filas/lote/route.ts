import { rolesDe } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aplicarReglasFila } from '@/lib/iperc/riesgoResidual'
import { clasificarControles, leerOrigenControles, textoOrdenado, textosDelCatalogo, CAMPOS_CONTROL } from '@/lib/iperc/origenControles'
import { ipercFilaSchema } from '@/lib/validators/iperc'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

// Los refs del cronograma pueden venir null (fila nueva con otra tarea).
const datosFilaSchema = ipercFilaSchema.extend({
  tareaCronogramaRefId: z.string().nullish(),
  actividadCronogramaRefId: z.string().nullish(),
})

const loteSchema = z.object({
  actualizar: z.array(z.object({ id: z.string().min(1), cambios: datosFilaSchema.partial() })).default([]),
  crear: z.array(z.object({ datos: datosFilaSchema, despuesDeId: z.string().nullish() })).default([]),
})

// POST /api/proyectos/[id]/iperc/filas/lote
// Aplica de una vez lo pegado desde texto (ida y vuelta con una IA): actualiza
// filas existentes y crea nuevas ubicadas detrás de la fila indicada. Todo en
// una transacción — o se guarda todo o nada. Nunca borra filas.
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const proy = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true, iperc: { select: { id: true } } },
  })
  if (!proy) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  if (!proy.iperc) return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
  const userId = session.user.id
  const esAsignado = [proy.gestorId, proy.supervisorId, proy.liderId, proy.comercialId].includes(userId)
  if (!rolesDe(session).some((r) => ROLES_CON_ACCESO.includes(r)) && !esAsignado) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const parsed = loteSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }
  const { actualizar, crear } = parsed.data
  if (actualizar.length === 0 && crear.length === 0) {
    return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 })
  }

  const ipercId = proy.iperc.id
  const actuales = await prisma.ipercFila.findMany({ where: { ipercId }, orderBy: { numero: 'asc' }, select: { id: true, numero: true } })
  const numeroActual = new Map(actuales.map((f) => [f.id, f.numero]))
  const idsActuales = new Set(actuales.map((f) => f.id))
  const ajenas = [...actualizar.map((a) => a.id), ...crear.map((c) => c.despuesDeId).filter((x): x is string => !!x)]
    .filter((id) => !idsActuales.has(id))
  if (ajenas.length) {
    return NextResponse.json({ error: 'Algunas filas ya no existen en el IPERC: recargá la página' }, { status: 409 })
  }

  const catalogo = await textosDelCatalogo()

  const filas = await prisma.$transaction(async (tx) => {
    for (const a of actualizar) {
      const previa = await tx.ipercFila.findUnique({
        where: { id: a.id },
        select: {
          severidad: true, probabilidad: true, origenControles: true,
          eliminar: true, sustituir: true,
          controlIngenieria: true, controlAdministrativo: true, controlReceptor: true,
        },
      })
      const datos = aplicarReglasFila(a.cambios, previa)
      // Viene de pegar la respuesta de una IA: lo nuevo se marca como tal.
      if (CAMPOS_CONTROL.some(c => c in a.cambios)) {
        const origen = clasificarControles(
          datos,
          catalogo,
          leerOrigenControles(previa?.origenControles),
          'ia',
        )
        for (const campo of CAMPOS_CONTROL) {
          if (campo in datos) (datos as Record<string, unknown>)[campo] = textoOrdenado(origen[campo] ?? [])
        }
        ;(datos as Record<string, unknown>).origenControles = origen as object
      }
      await tx.ipercFila.update({ where: { id: a.id }, data: datos })
    }

    // Nuevas: detrás de su fila ancla, en el orden del texto (varias seguidas
    // detrás de la misma ancla quedan una tras otra).
    const orden = actuales.map((f) => f.id)
    const ultimaDetrasDe = new Map<string, string>()
    for (const c of crear) {
      const creada = await tx.ipercFila.create({
        data: {
          ipercId,
          numero: orden.length + 1,
          ...aplicarReglasFila(c.datos),
          origenControles: clasificarControles(
            c.datos, catalogo, null, 'ia',
          ) as object,
        },
        select: { id: true },
      })
      const ancla = c.despuesDeId ? (ultimaDetrasDe.get(c.despuesDeId) ?? c.despuesDeId) : null
      const pos = ancla ? orden.indexOf(ancla) + 1 : orden.length
      orden.splice(pos, 0, creada.id)
      if (c.despuesDeId) ultimaDetrasDe.set(c.despuesDeId, creada.id)
    }

    // Renumerar solo las que se corren (las nuevas siempre).
    if (crear.length) {
      for (let i = 0; i < orden.length; i++) {
        if (numeroActual.get(orden[i]) === i + 1) continue
        await tx.ipercFila.update({ where: { id: orden[i] }, data: { numero: i + 1 } })
      }
    }
    return tx.ipercFila.findMany({ where: { ipercId }, orderBy: { numero: 'asc' } })
  }, { timeout: 60_000 })

  return NextResponse.json({ data: filas, actualizadas: actualizar.length, creadas: crear.length })
}
