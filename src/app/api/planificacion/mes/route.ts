import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { colorParaProyecto, iniciales, toDateKey } from '@/lib/utils/planificacion'

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
    const anioStr = searchParams.get('anio')
    const mesStr = searchParams.get('mes')
    const departamentoId = searchParams.get('departamentoId')

    if (!anioStr || !mesStr) {
      return NextResponse.json({ error: 'Parámetros anio y mes requeridos' }, { status: 400 })
    }

    const anio = parseInt(anioStr)
    const mes = parseInt(mesStr) // 1-12
    if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'anio o mes inválido' }, { status: 400 })
    }

    const inicio = new Date(Date.UTC(anio, mes - 1, 1))
    const fin = new Date(Date.UTC(anio, mes, 0)) // último día del mes

    // Construir array con todos los días del mes
    const dias: Date[] = []
    for (let d = new Date(inicio); d <= fin; d = new Date(d.getTime() + 86400000)) {
      dias.push(new Date(d))
    }

    // Departamento (opcional)
    const departamento = departamentoId
      ? await prisma.departamento.findUnique({
          where: { id: departamentoId },
          select: { id: true, nombre: true },
        })
      : null

    // Empleados activos del departamento (o todos)
    const empleados = await prisma.empleado.findMany({
      where: {
        activo: true,
        ...(departamentoId ? { departamentoId } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        cargo: { select: { nombre: true } },
      },
      orderBy: { user: { name: 'asc' } },
    })

    if (empleados.length === 0) {
      return NextResponse.json({
        mes: { anio, mes, inicio: toDateKey(inicio), fin: toDateKey(fin) },
        departamento,
        personas: [],
        proyectos: [],
      })
    }

    const userIds = empleados.map((e) => e.userId)

    // Cargar celdas del mes
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
      orderBy: [{ fecha: 'asc' }],
    })

    const proyectosSet = new Map<
      string,
      { id: string; codigo: string; nombre: string; color: string }
    >()

    const mapaPersonaDia = new Map<string, Map<string, CeldaEntry[]>>()
    for (const u of userIds) mapaPersonaDia.set(u, new Map())

    for (const celda of celdas) {
      const dKey = toDateKey(celda.fecha)
      const m = mapaPersonaDia.get(celda.userId)!
      if (!m.has(dKey)) m.set(dKey, [])

      if (celda.proyectoId && celda.proyecto) {
        const color = colorParaProyecto(celda.proyectoId)
        proyectosSet.set(celda.proyectoId, {
          id: celda.proyectoId,
          codigo: celda.proyecto.codigo,
          nombre: celda.proyecto.nombre,
          color,
        })
        m.get(dKey)!.push({
          id: celda.id,
          turno: celda.turno,
          tipo: 'proyecto',
          proyecto: { ...celda.proyecto, color },
          esExcepcional: celda.esExcepcional,
          notas: celda.notas,
        })
      } else if (celda.solicitudAusenciaId) {
        const ta = celda.solicitudAusencia?.tipoAusencia
        m.get(dKey)!.push({
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

    // Días laborables del mes (Lun–Vie)
    const diasLaborables = dias.filter((d) => {
      const dw = d.getUTCDay()
      return dw !== 0 && dw !== 6
    }).length

    const personas = empleados.map((emp) => {
      const m = mapaPersonaDia.get(emp.userId)!
      const diasObj: Record<string, CeldaEntry[]> = {}
      let diasConProyecto = 0

      for (const dia of dias) {
        const k = toDateKey(dia)
        const c = m.get(k) ?? []
        diasObj[k] = c
        if (c.some((x) => x.tipo === 'proyecto')) diasConProyecto++
      }

      return {
        userId: emp.userId,
        nombre: emp.user.name ?? emp.userId,
        iniciales: iniciales(emp.user.name ?? ''),
        cargo: emp.cargo?.nombre ?? null,
        utilizacion: `${diasConProyecto}/${diasLaborables}`,
        dias: diasObj,
      }
    })

    return NextResponse.json({
      mes: { anio, mes, inicio: toDateKey(inicio), fin: toDateKey(fin) },
      departamento,
      personas,
      proyectos: Array.from(proyectosSet.values()),
    })
  } catch (error) {
    console.error('[GET /api/planificacion/mes]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
