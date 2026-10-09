import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { construirTareaPropuesta } from '@/lib/cronogramaIA/reglasActividades'
import type { ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

/**
 * Paso 3 — servicios del catálogo de un EDT (?edt=CON) ya convertidos a
 * TareaPropuesta con la MISMA función que usa la generación
 * (construirTareaPropuesta + la configuración del Paso 1), para que una
 * tarea agregada a mano tenga exactamente las horas/cantidad que habría
 * tenido si el asistente la hubiera traído. Solo lectura, nunca llama IA.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { generacionId } = await params
  const edtNombre = req.nextUrl.searchParams.get('edt')
  if (!edtNombre) {
    return NextResponse.json({ error: 'Falta el parámetro edt' }, { status: 400 })
  }

  const generacion = await prisma.proyectoCronogramaGeneracionIA.findUnique({
    where: { id: generacionId },
    select: { proyectoCronogramaId: true, configuracion: true },
  })
  if (!generacion) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }

  const validacion = await validarPermisoCronograma(generacion.proyectoCronogramaId, { ignoreBloqueo: true })
  if (!validacion.ok) return validacion.response

  const edt = await prisma.edt.findUnique({
    where: { nombre: edtNombre },
    include: {
      catalogoServicio: { include: { unidadServicio: true, recurso: true }, orderBy: { orden: 'asc' } },
    },
  })
  if (!edt) {
    return NextResponse.json({ error: `EDT "${edtNombre}" no existe en el catálogo` }, { status: 404 })
  }

  const config = generacion.configuracion as unknown as ConfiguracionWizardPaso1
  const tareas = edt.catalogoServicio.map(s => ({
    ...construirTareaPropuesta(
      {
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        edtNombre: edt.nombre,
        actividadTag: s.actividadTag,
        filtroAlcance: s.filtroAlcance,
        notaCantidad: s.notaCantidad,
        horaBase: s.horaBase,
        horaRepetido: s.horaRepetido,
        cantidad: s.cantidad,
        nivelDificultad: s.nivelDificultad,
        orden: s.orden,
        unidadNombre: s.unidadServicio.nombre,
        recursoNombre: s.recurso.nombre,
      },
      config
    ),
    // El usuario la eligió explícitamente: entra incluida aunque su
    // filtroAlcance la hubiera excluido por defecto.
    incluida: true,
    motivoExclusion: undefined,
  }))

  return NextResponse.json({ tareas })
}
