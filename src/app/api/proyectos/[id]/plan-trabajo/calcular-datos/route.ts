import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cargarContextoPlanTrabajo } from '@/lib/planTrabajo/cargarContexto'
import { adquirirLockIA, liberarLockIA } from '@/lib/planTrabajo/mutex'
import { calcularDatosEtapa1 } from '@/lib/planTrabajo/calcularDatos'
import { guardarSeccionesCalculadas } from '@/lib/planTrabajo/guardarSecciones'
import { SECCIONES_ETAPA_1 } from '@/lib/planTrabajo/etapas'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/proyectos/[id]/plan-trabajo/calcular-datos
// Etapa 1: calcula y persiste personalAsignado, matrizRaci, histogramas,
// cronogramaResumen y referencias directamente desde BD — sin IA, instantáneo.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const proyectoBase = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyectoBase) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role, id: userId } = session.user
  const rolesConAccesoTotal = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']
  const esGestorODirectivo =
    proyectoBase.gestorId === userId ||
    proyectoBase.supervisorId === userId ||
    proyectoBase.liderId === userId ||
    proyectoBase.comercialId === userId

  if (!rolesConAccesoTotal.includes(role) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const contexto = await cargarContextoPlanTrabajo(proyectoId)
  if (!contexto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  if (!contexto.prerrequisitos.puedeGenerar) {
    return NextResponse.json(
      {
        error: 'No se pueden calcular los datos del Plan de Trabajo',
        bloqueantesFaltantes: contexto.prerrequisitos.bloqueantesFaltantes,
      },
      { status: 409 }
    )
  }

  if (!contexto.planTrabajo) {
    return NextResponse.json(
      { error: 'El Plan de Trabajo no existe — crearlo primero con POST /plan-trabajo' },
      { status: 409 }
    )
  }

  const planId = contexto.planTrabajo.id
  // Mismo mutex que generar-ia/regenerar-seccion: evita que Etapa 1 y Etapa 2
  // escriban el mismo PlanTrabajo al mismo tiempo (aunque Etapa 1 no llama IA).
  const lock = await adquirirLockIA(planId, 'calcular-datos')
  if (!lock.ok) {
    const segs = Math.round((Date.now() - lock.conflicto!.iniciadaEn.getTime()) / 1000)
    return NextResponse.json(
      { error: `Ya hay una operación en curso (${lock.conflicto?.operacion}), iniciada hace ${segs}s.` },
      { status: 409 }
    )
  }

  try {
    const { data, advertencias } = calcularDatosEtapa1(contexto)

    await guardarSeccionesCalculadas(proyectoId, {
      personalAsignado: data.personalAsignado,
      matrizRaci: data.matrizRaci,
      histogramas: data.histogramas,
      cronogramaResumen: data.cronogramaResumen,
      referencias: data.referencias,
    })

    return NextResponse.json({
      data: {
        seccionesCalculadas: SECCIONES_ETAPA_1,
        totalHH: data.totalHH,
        personas: data.personalAsignado.length,
        edtsEnRaci: data.matrizRaci.filas.length,
      },
      advertencias,
    })
  } catch (error: unknown) {
    console.error('[calcular-datos] Error:', error)
    const mensaje = error instanceof Error ? error.message : 'Error interno al calcular los datos'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  } finally {
    await liberarLockIA(planId)
  }
}
