// GET /api/proyectos/[id]/cronograma/calendario
//
// Calendario laboral efectivo del cronograma del proyecto (el asignado al
// proyecto o, si no tiene, el primer calendario activo): jornada, días
// laborables, configuración por día y excepciones. Lo usa la exportación a
// MS Project (XML) para que MS Project calcule igual que GYS.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerCalendarioProyecto } from '@/lib/services/cronogramaDesplazamiento'
import { horasPorDiaCalendario } from '@/lib/services/cronogramaHoras'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const cal = await obtenerCalendarioProyecto(id)
  const c = cal as typeof cal & { nombre?: string }
  return NextResponse.json({
    nombre: c.nombre ?? 'Calendario GYS',
    horasPorDia: horasPorDiaCalendario(cal),
    diasLaborables: cal.diasLaborables,
    horaInicioManana: cal.horaInicioManana,
    horaFinManana: cal.horaFinManana,
    horaInicioTarde: cal.horaInicioTarde,
    horaFinTarde: cal.horaFinTarde,
    diaCalendario: cal.diaCalendario,
    excepcionCalendario: cal.excepcionCalendario,
  })
}
