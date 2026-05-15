import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import {
  colorParaProyecto,
  iniciales,
  toDateKey,
  addDays,
  dateToISOWeek,
} from '@/lib/utils/planificacion'

type CeldaEntry = {
  id: string
  turno: string
  tipo: 'proyecto' | 'ausencia'
  proyecto?: { id: string; codigo: string; nombre: string; color: string }
  ausencia?: { tipo: string | undefined; codigo: string | undefined; color: string | undefined }
  esExcepcional: boolean
  notas: string | null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const inicioStr = searchParams.get('inicio')
    const departamentosParam = searchParams.get('departamentos') // comma-separated IDs (new)
    const departamentoId = searchParams.get('departamentoId')   // single ID (backward compat)

    if (!inicioStr) {
      return NextResponse.json(
        { error: 'Parámetro inicio requerido (YYYY-MM-DD)' },
        { status: 400 },
      )
    }

    const inicio = new Date(inicioStr + 'T00:00:00.000Z')
    if (isNaN(inicio.getTime())) {
      return NextResponse.json({ error: 'Fecha inicio inválida' }, { status: 400 })
    }
    if (inicio.getUTCDay() !== 1) {
      return NextResponse.json({ error: 'La fecha inicio debe ser un lunes' }, { status: 400 })
    }

    const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
    const fin = dias[6]

    // Departamento único para compatibilidad backward (respuesta)
    const departamento = departamentoId
      ? await prisma.departamento.findUnique({
          where: { id: departamentoId },
          select: { id: true, nombre: true },
        })
      : null

    // Nombres de los 4 departamentos por defecto
    const DEPARTAMENTOS_DEFAULT = ['INGENIERIA', 'CONSTRUCCION', 'GESTION', 'PROYECTOS']

    // Empleados activos:
    //   - departamentosParam (multi-ID): filtra por esos IDs
    //   - departamentoId (single): filtra por ese ID
    //   - ninguno: filtra por los 4 departamentos por defecto
    const empleados = await prisma.empleado.findMany({
      where: {
        activo: true,
        ...(departamentosParam
          ? { departamentoId: { in: departamentosParam.split(',').filter(Boolean) } }
          : departamentoId
            ? { departamentoId }
            : {
                departamento: {
                  OR: DEPARTAMENTOS_DEFAULT.map((n) => ({
                    nombre: { equals: n, mode: 'insensitive' as const },
                  })),
                },
              }),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        cargo: { select: { nombre: true } },
        departamento: { select: { id: true, nombre: true } },
      },
      orderBy: [{ departamento: { nombre: 'asc' } }, { user: { name: 'asc' } }],
    })

    if (empleados.length === 0) {
      return NextResponse.json({
        semana: {
          inicio: toDateKey(inicio),
          fin: toDateKey(fin),
          isoWeek: dateToISOWeek(inicio),
        },
        departamento,
        personas: [],
        proyectos: [],
      })
    }

    const userIds = empleados.map((e) => e.userId)

    // Cargar todas las celdas de planificación de la semana
    const celdas = await prisma.planificacionDia.findMany({
      where: { userId: { in: userIds }, fecha: { gte: inicio, lte: fin } },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        solicitudAusencia: {
          select: {
            tipoAusencia: { select: { nombre: true, codigo: true, color: true } },
          },
        },
      },
      orderBy: [{ fecha: 'asc' }, { turno: 'asc' }],
    })

    // Agrupar por userId → fecha → celdas
    const mapaPersonaDia = new Map<string, Map<string, CeldaEntry[]>>()
    for (const u of userIds) mapaPersonaDia.set(u, new Map())

    const proyectosSet = new Map<
      string,
      { id: string; codigo: string; nombre: string; color: string }
    >()

    for (const celda of celdas) {
      const dKey = toDateKey(celda.fecha)
      const personaDias = mapaPersonaDia.get(celda.userId)!
      if (!personaDias.has(dKey)) personaDias.set(dKey, [])

      if (celda.proyectoId && celda.proyecto) {
        const color = colorParaProyecto(celda.proyectoId)
        proyectosSet.set(celda.proyectoId, {
          id: celda.proyectoId,
          codigo: celda.proyecto.codigo,
          nombre: celda.proyecto.nombre,
          color,
        })
        personaDias.get(dKey)!.push({
          id: celda.id,
          turno: celda.turno,
          tipo: 'proyecto',
          proyecto: { ...celda.proyecto, color },
          esExcepcional: celda.esExcepcional,
          notas: celda.notas,
        })
      } else if (celda.solicitudAusenciaId && celda.solicitudAusencia) {
        const ta = celda.solicitudAusencia.tipoAusencia
        personaDias.get(dKey)!.push({
          id: celda.id,
          turno: celda.turno,
          tipo: 'ausencia',
          ausencia: {
            tipo: ta?.nombre ?? undefined,
            codigo: ta?.codigo ?? undefined,
            color: ta?.color ?? undefined,
          },
          esExcepcional: celda.esExcepcional,
          notas: celda.notas,
        })
      }
    }

    const diasLaborables = 5 // Lun–Vie

    const personas = empleados.map((emp) => {
      const personaDias = mapaPersonaDia.get(emp.userId)!
      const diasObj: Record<string, CeldaEntry[]> = {}
      const diasContados = new Set<string>()
      let diasConProyecto = 0

      for (const dia of dias) {
        const k = toDateKey(dia)
        const celdasDia = personaDias.get(k) ?? []
        diasObj[k] = celdasDia
        if (!diasContados.has(k) && celdasDia.some((c) => c.tipo === 'proyecto')) {
          diasContados.add(k)
          diasConProyecto++
        }
      }

      return {
        userId: emp.userId,
        nombre: emp.user.name ?? emp.userId,
        iniciales: iniciales(emp.user.name ?? emp.userId),
        cargo: emp.cargo?.nombre ?? null,
        departamentoId: emp.departamentoId ?? '',
        departamentoNombre: emp.departamento?.nombre ?? 'Sin departamento',
        utilizacion: `${diasConProyecto}/${diasLaborables}`,
        dias: diasObj,
      }
    })

    return NextResponse.json({
      semana: {
        inicio: toDateKey(inicio),
        fin: toDateKey(fin),
        isoWeek: dateToISOWeek(inicio),
      },
      departamento,
      personas,
      proyectos: Array.from(proyectosSet.values()),
    })
  } catch (error) {
    console.error('[GET /api/planificacion/semana]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
