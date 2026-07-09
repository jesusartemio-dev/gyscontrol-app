import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_CRONOGRAMA } from '@/lib/services/cronogramaPermisos'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { generarPrellenadoPaso1 } from '@/lib/cronogramaIA/generarPrellenadoPaso1'
import type { EdtParaPrellenado } from '@/lib/cronogramaIA/prompts'

export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

interface LineaClasificada {
  descripcion: string
  monto: number
  categoria: 'equipos' | 'servicios' | 'gastos'
}

/**
 * Paso 1 pre-llenado con IA — el catálogo es estático (siempre los mismos
 * EDTs/servicios disponibles), lo que cambia por proyecto es la cotización
 * real. Se llama automáticamente al abrir el wizard, solo si el proyecto
 * tiene una ProyectoCotizacionDocumento extraída; el resultado siempre
 * llega editable al Paso 1, nunca se aplica directo.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role, id: userId } = session.user
  const esGestorODirectivo =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId

  if (!ROLES_CRONOGRAMA.includes(role as (typeof ROLES_CRONOGRAMA)[number]) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  if (!(await isIAFeatureEnabled('cronogramaPlanificacionIA'))) {
    return NextResponse.json({ error: 'La generación de cronograma con IA está deshabilitada.' }, { status: 403 })
  }

  const cotizacionDoc = await prisma.proyectoCotizacionDocumento.findUnique({
    where: { proyectoId },
    select: { resumenAlcance: true, exclusiones: true, lineasClasificadas: true },
  })
  if (!cotizacionDoc) {
    return NextResponse.json({ error: 'Este proyecto no tiene una cotización extraída — completa el Paso 1 manualmente.' }, { status: 404 })
  }

  const edtsDb = await prisma.edt.findMany({ select: { id: true, nombre: true, descripcion: true } })
  const edtsCandidatos: EdtParaPrellenado[] = edtsDb.map(e => ({ id: e.id, nombre: e.nombre, descripcion: e.descripcion ?? e.nombre }))

  const lineasClasificadas = (cotizacionDoc.lineasClasificadas as LineaClasificada[] | null) ?? []
  const cotizacion = {
    resumenAlcance: (cotizacionDoc.resumenAlcance as string[] | null) ?? [],
    exclusiones: (cotizacionDoc.exclusiones as string[] | null) ?? [],
    lineas: lineasClasificadas
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 30)
      .map(l => ({ descripcion: l.descripcion, monto: l.monto })),
  }

  const resultado = await generarPrellenadoPaso1({
    edtsCandidatos,
    cotizacion,
    userId,
    proyectoId,
  })

  return NextResponse.json(resultado)
}
