// POST /api/proyectos/[id]/cronograma/calcular-fechas
//
// Cálculo de fechas con el calendario laboral del proyecto (jornada, feriados,
// días extra como paradas), para el formulario de tarea — como MS Project:
// - { inicio, horas }  → fin = inicio + horas laborables.
// - { inicio, fin }    → horas laborables entre ambos.
// Fechas en "hora de obra" ("YYYY-MM-DDTHH:MM" sin zona); "YYYY-MM-DD" va al
// inicio/fin de la jornada. Solo calcula, no guarda nada.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { obtenerCalendarioProyecto } from '@/lib/services/cronogramaDesplazamiento'
import {
  fechaDeFormulario,
  formatearDuracion,
  horasLaborablesEntre,
  horasPorDiaCalendario,
  siguienteMomentoLaborable,
  sumarHorasLaborables,
} from '@/lib/services/cronogramaHoras'

const schema = z.object({
  inicio: z.string().min(10),
  horas: z.number().min(0).optional(),
  fin: z.string().min(10).optional(),
})

// "YYYY-MM-DDTHH:MM" (hora de obra), lo que usan los inputs datetime-local.
const aTexto = (d: Date) => d.toISOString().slice(0, 16)

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const { horas, fin } = parsed.data

  const cal = await obtenerCalendarioProyecto(id)
  const hpd = horasPorDiaCalendario(cal)
  const inicio = siguienteMomentoLaborable(cal, fechaDeFormulario(cal, parsed.data.inicio, 'inicio'))

  let fechaFin: Date
  let horasLab: number
  if (horas !== undefined) {
    horasLab = horas
    fechaFin = horas > 0 ? sumarHorasLaborables(cal, inicio, horas) : inicio
  } else if (fin) {
    fechaFin = fechaDeFormulario(cal, fin, 'fin')
    horasLab = horasLaborablesEntre(cal, inicio, fechaFin)
  } else {
    return NextResponse.json({ error: 'Indica horas o fin' }, { status: 400 })
  }

  return NextResponse.json({
    inicio: aTexto(inicio),
    fin: aTexto(fechaFin),
    horas: Math.round(horasLab * 100) / 100,
    texto: formatearDuracion(horasLab, hpd),
    horasPorDia: hpd,
  })
}
