import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planTrabajoPatchSchema } from '@/lib/validators/planTrabajo'
import { calcularCompletitud } from '@/lib/planTrabajo/completitud'
import { toPrismaJsonNullable } from '@/lib/planTrabajo/prismaJson'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/proyectos/[id]/plan-trabajo
// Crea el PlanTrabajo vacío para el proyecto (idempotente: 409 si ya existe)
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      id: true,
      codigo: true,
      ordenCompraCliente: true,
      planTrabajo: true,
    },
  })

  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  if (proyecto.planTrabajo) {
    return NextResponse.json(
      { error: 'Ya existe un Plan de Trabajo para este proyecto', data: proyecto.planTrabajo },
      { status: 409 }
    )
  }

  // Generar código de documento sugerido
  const codigoDocumento = proyecto.ordenCompraCliente
    ? `PT-${proyecto.codigo}-${proyecto.ordenCompraCliente}`
    : `PT-${proyecto.codigo}-GYS-001`

  const bloquesVacios = {
    objetivo: false,
    alcanceGeneral: false,
    alcanceDetallado: false,
    eppRequeridos: false,
    herramientasYEquipos: false,
    restricciones: false,
    personalAsignado: false,
    matrizRaci: false,
    histogramas: false,
    cronogramaResumen: false,
    responsabilidades: false,
    referencias: false,
  }

  const planTrabajo = await prisma.planTrabajo.create({
    data: {
      proyectoId,
      codigoDocumento,
      numeroRevision: 'A',
      tipoEmision: 'B - Para Revisión',
      incluirOrganigrama: true,
      incluirMatriz: true,
      incluirCronograma: true,
      incluirHistogramas: true,
      incluirTDR: true,
      bloquesCompletitud: bloquesVacios,
    },
  })

  return NextResponse.json({ data: planTrabajo }, { status: 201 })
}

// PATCH /api/proyectos/[id]/plan-trabajo
// Actualiza cabecera, toggles y/o secciones JSON
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const body = await req.json()
  const parsed = planTrabajoPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Plan de Trabajo no encontrado' }, { status: 404 })
  }

  const {
    alcanceDetallado,
    eppRequeridos,
    herramientasYEquipos,
    restricciones,
    personalAsignado,
    matrizRaci,
    histogramas,
    cronogramaResumen,
    responsabilidades,
    referencias,
    ...scalarData
  } = parsed.data

  const updated = await prisma.planTrabajo.update({
    where: { proyectoId },
    data: {
      ...scalarData,
      ...(alcanceDetallado !== undefined && { alcanceDetallado: toPrismaJsonNullable(alcanceDetallado) }),
      ...(eppRequeridos !== undefined && { eppRequeridos: toPrismaJsonNullable(eppRequeridos) }),
      ...(herramientasYEquipos !== undefined && { herramientasYEquipos: toPrismaJsonNullable(herramientasYEquipos) }),
      ...(restricciones !== undefined && { restricciones: toPrismaJsonNullable(restricciones) }),
      ...(personalAsignado !== undefined && { personalAsignado: toPrismaJsonNullable(personalAsignado) }),
      ...(matrizRaci !== undefined && { matrizRaci: toPrismaJsonNullable(matrizRaci) }),
      ...(histogramas !== undefined && { histogramas: toPrismaJsonNullable(histogramas) }),
      ...(cronogramaResumen !== undefined && { cronogramaResumen: toPrismaJsonNullable(cronogramaResumen) }),
      ...(responsabilidades !== undefined && { responsabilidades: toPrismaJsonNullable(responsabilidades) }),
      ...(referencias !== undefined && { referencias: toPrismaJsonNullable(referencias) }),
    },
  })

  const bloques = calcularCompletitud(updated)
  const withCompletitud = await prisma.planTrabajo.update({
    where: { proyectoId },
    data: { bloquesCompletitud: bloques },
  })

  return NextResponse.json({ data: withCompletitud })
}

// DELETE /api/proyectos/[id]/plan-trabajo
// Elimina el PlanTrabajo (y sus generaciones por CASCADE en la FK)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const plan = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    select: { id: true },
  })

  if (!plan) {
    return NextResponse.json({ error: 'El plan no existe' }, { status: 404 })
  }

  await prisma.planTrabajo.delete({ where: { id: plan.id } })

  return NextResponse.json({ ok: true })
}

// GET /api/proyectos/[id]/plan-trabajo
// Devuelve el PlanTrabajo con generaciones
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const planTrabajo = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    include: {
      generaciones: {
        orderBy: { generadoEn: 'desc' },
      },
    },
  })

  if (!planTrabajo) {
    return NextResponse.json({ data: null })
  }

  return NextResponse.json({ data: planTrabajo })
}
