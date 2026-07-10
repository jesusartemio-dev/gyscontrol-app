import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { obtenerCalendarioLaboral } from '@/lib/utils/calendarioLaboral'
import { construirEstructuraReal, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
import { sugerirDependencias } from '@/lib/cronogramaIA/reglasDependencias'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

export const maxDuration = 120

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { generacionId } = await params

  const generacion = await prisma.proyectoCronogramaGeneracionIA.findUnique({
    where: { id: generacionId },
    select: { id: true, proyectoCronogramaId: true, estado: true, propuestaActividades: true },
  })
  if (!generacion) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }
  if (generacion.estado === 'aplicado') {
    return NextResponse.json({ error: 'Esta generación ya fue aplicada al cronograma.' }, { status: 409 })
  }

  const validacion = await validarPermisoCronograma(generacion.proyectoCronogramaId)
  if (!validacion.ok) return validacion.response

  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { id: generacion.proyectoCronogramaId },
    select: {
      id: true,
      proyectoId: true,
      proyecto: {
        select: {
          fechaInicio: true,
          cotizacion: {
            select: {
              calendarioLaboral: { include: { diaCalendario: true, excepcionCalendario: true } },
            },
          },
        },
      },
    },
  })
  if (!cronograma) {
    return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
  }

  let calendarioLaboral = cronograma.proyecto.cotizacion?.calendarioLaboral ?? null
  if (!calendarioLaboral) {
    calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
  }
  if (!calendarioLaboral) {
    return NextResponse.json({ error: 'No hay calendario laboral configurado — no se puede calcular el cronograma.' }, { status: 400 })
  }
  if (!calendarioLaboral.horasPorDia || calendarioLaboral.horasPorDia <= 0) {
    calendarioLaboral.horasPorDia = 8
  }

  const todasActividades = (generacion.propuestaActividades as unknown as ActividadPropuesta[]) ?? []
  const actividadesIncluidas: ActividadPropuesta[] = todasActividades
    .map(a => ({ ...a, tareas: a.tareas.filter(t => t.incluida) }))
    .filter(a => a.tareas.length > 0)

  if (actividadesIncluidas.length === 0) {
    return NextResponse.json({ error: 'No hay tareas incluidas para generar — revisa los filtros de alcance del Paso 1.' }, { status: 422 })
  }

  const edtNombres = Array.from(new Set(actividadesIncluidas.map(a => a.edtNombre)))
  const edtsDb = await prisma.edt.findMany({
    where: { nombre: { in: edtNombres } },
    include: { faseDefault: true },
  })
  const edtsCatalogo = new Map<string, EdtCatalogoInfo>(
    edtsDb
      .filter(e => e.faseDefault)
      .map(e => [
        e.nombre,
        {
          id: e.id,
          nombre: e.nombre,
          descripcionEdt: e.descripcion || e.nombre,
          faseNombre: e.faseDefault!.nombre,
          faseOrden: e.faseDefault!.orden,
          edtOrden: e.orden,
        },
      ])
  )

  const estructura = construirEstructuraReal({
    actividades: actividadesIncluidas,
    edtsCatalogo,
    proyectoId: cronograma.proyectoId,
    proyectoCronogramaId: cronograma.id,
    fechaInicioProyecto: cronograma.proyecto.fechaInicio,
    calendarioLaboral,
  })

  if (estructura.fases.length === 0) {
    return NextResponse.json(
      { error: 'Ningún EDT de la propuesta coincide con el catálogo real — no se generó nada.', advertencias: estructura.advertencias },
      { status: 422 }
    )
  }

  const tareasParaDependencias = estructura.tareas.map(t => ({
    id: t.id,
    nombre: t.nombre,
    edtNombre: estructura.edtIdACodigo.get(t.proyectoEdtId) ?? '',
  }))
  const dependenciasSugeridas = sugerirDependencias(tareasParaDependencias)

  const primeraFase = estructura.fases[0]
  const ultimaFase = estructura.fases[estructura.fases.length - 1]
  const hitos = [
    {
      id: randomUUID(),
      proyectoId: cronograma.proyectoId,
      tipo: 'contractual' as const,
      nombre: 'Inicio de Proyecto',
      orden: 0,
      fechaPlan: primeraFase.fechaInicioPlan,
      proyectoFaseId: primeraFase.id,
    },
    {
      id: randomUUID(),
      proyectoId: cronograma.proyectoId,
      tipo: 'intermedio' as const,
      nombre: 'Aprobación de Línea Base',
      orden: 1,
      fechaPlan: new Date(),
      proyectoFaseId: null,
    },
    {
      id: randomUUID(),
      proyectoId: cronograma.proyectoId,
      tipo: 'contractual' as const,
      nombre: 'Fin de Proyecto',
      orden: 2,
      fechaPlan: ultimaFase.fechaFinPlan,
      proyectoFaseId: ultimaFase.id,
    },
  ]

  await prisma.$transaction([
    prisma.proyectoFase.createMany({ data: estructura.fases }),
    prisma.proyectoEdt.createMany({ data: estructura.edts }),
    prisma.proyectoActividad.createMany({ data: estructura.actividades }),
    prisma.proyectoTarea.createMany({ data: estructura.tareas }),
    ...(dependenciasSugeridas.length > 0
      ? [
          prisma.proyectoDependenciasTarea.createMany({
            data: dependenciasSugeridas.map(d => ({ id: randomUUID(), ...d })),
          }),
        ]
      : []),
    prisma.proyectoHito.createMany({ data: hitos }),
  ])

  const resultado = {
    fasesCreadas: estructura.fases.length,
    edtsCreados: estructura.edts.length,
    actividadesCreadas: estructura.actividades.length,
    tareasCreadas: estructura.tareas.length,
    dependenciasCreadas: dependenciasSugeridas.length,
    hitosCreados: hitos.length,
  }

  await prisma.proyectoCronogramaGeneracionIA.update({
    where: { id: generacionId },
    data: {
      estado: 'aplicado',
      aplicadoEn: new Date(),
      resultado,
      advertencias: estructura.advertencias.length > 0 ? estructura.advertencias : undefined,
    },
  })

  // Auditoría de decisiones (Fase 2, punto f): una fila por tarea regida por
  // una regla de sub-alcance (CMM hoy, ING/PLA más adelante) con lo que la
  // regla decidió vs. lo que el usuario dejó al aplicar de verdad — para
  // calibrar esas reglas con uso real. Nunca bloquea la generación si falla.
  const decisiones = todasActividades.flatMap(a =>
    a.tareas
      .filter(t => t.reglaClave !== undefined && t.incluidaPorRegla !== undefined)
      .map(t => ({
        id: randomUUID(),
        proyectoId: cronograma.proyectoId,
        generacionId,
        catalogoServicioId: t.catalogoServicioId,
        edtNombre: a.edtNombre,
        actividadNombre: a.actividadNombre,
        reglaClave: t.reglaClave!,
        incluidaPorRegla: t.incluidaPorRegla!,
        incluidaFinal: t.incluida,
        forzada: t.incluida !== t.incluidaPorRegla,
        decididoPorId: session.user.id,
      }))
  )
  if (decisiones.length > 0) {
    try {
      await prisma.cronogramaIATareaDecision.createMany({ data: decisiones })
    } catch (e) {
      console.error('No se pudo registrar la auditoría de decisiones de sub-alcance:', e)
    }
  }

  return NextResponse.json({ generacionId, resultado, advertencias: estructura.advertencias })
}
