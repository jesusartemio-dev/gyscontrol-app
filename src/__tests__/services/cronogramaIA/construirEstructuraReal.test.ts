import { construirEstructuraReal, agruparYOrdenarPorEstructura, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
import type { ActividadPropuesta, TareaPropuesta } from '@/types/cronogramaIA'

function mockCalendario() {
  return {
    horasPorDia: 8,
    diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    horaInicioManana: '08:00',
    horaFinManana: '12:00',
    horaInicioTarde: '13:00',
    horaFinTarde: '17:00',
    diaCalendario: [],
    excepcionCalendario: [],
  }
}

function tarea(id: string, nombre: string, horas: number, orden = 0): TareaPropuesta {
  return { catalogoServicioId: id, nombre, cantidad: 1, nivelDificultad: 1, horaBase: horas, horaRepetido: 0, horasEstimadas: horas, incluida: true, orden }
}

const EDTS_CATALOGO: Map<string, EdtCatalogoInfo> = new Map([
  ['GES', { id: 'edt-ges', nombre: 'GES', descripcionEdt: 'Gestion del Proyecto', faseNombre: 'PLANIFICACION', faseOrden: 1, edtOrden: 0 }],
  ['ING', { id: 'edt-ing', nombre: 'ING', descripcionEdt: 'Ingenieria de Detalle', faseNombre: 'INGENIERIA', faseOrden: 2, edtOrden: 0 }],
  ['CON', { id: 'edt-con', nombre: 'CON', descripcionEdt: 'Construccion', faseNombre: 'EJECUCION', faseOrden: 4, edtOrden: 2 }],
  ['CMM', { id: 'edt-cmm', nombre: 'CMM', descripcionEdt: 'Comisionamiento', faseNombre: 'EJECUCION', faseOrden: 4, edtOrden: 3 }],
])

describe('construirEstructuraReal', () => {
  const fechaInicioProyecto = new Date('2026-08-03T00:00:00') // lunes

  it('crea 1 fila por Fase/EDT/Actividad/Tarea, sin duplicar ni perder ninguna', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'Kickoff', 8)], origen: 'determinista' },
      { edtNombre: 'ING', actividadNombre: 'Disciplina Eléctrica', tareas: [tarea('t2', 'Listado de Cables', 16)], origen: 'determinista' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })

    expect(r.fases).toHaveLength(2)
    expect(r.edts).toHaveLength(2)
    expect(r.actividades).toHaveLength(2)
    expect(r.tareas).toHaveLength(2)
    expect(r.advertencias).toHaveLength(0)
  })

  it('ordena las Fases por FaseDefault.orden, no por orden de aparición en actividades', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'CON', actividadNombre: 'Zona A', tareas: [tarea('t1', 'Tendido', 8)], origen: 'ia' },
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t2', 'Kickoff', 8)], origen: 'determinista' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })
    expect(r.fases.map(f => f.nombre)).toEqual(['PLANIFICACION', 'EJECUCION'])
    expect(r.fases[0].fechaInicioPlan.getTime()).toBeLessThan(r.fases[1].fechaInicioPlan.getTime())
  })

  it('las fechas de EDT/Actividad/Tarea son secuenciales y coherentes (hijo dentro del rango del padre)', () => {
    const actividades: ActividadPropuesta[] = [
      {
        edtNombre: 'GES',
        actividadNombre: 'Inicio',
        tareas: [tarea('t1', 'Kickoff', 8), tarea('t2', 'RFI', 16)],
        origen: 'determinista',
      },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })

    const fase = r.fases[0]
    const edt = r.edts[0]
    const actividad = r.actividades[0]
    const [tarea1, tarea2] = r.tareas

    expect(edt.fechaInicioPlan.getTime()).toBeGreaterThanOrEqual(fase.fechaInicioPlan.getTime())
    expect(edt.fechaFinPlan.getTime()).toBeLessThanOrEqual(fase.fechaFinPlan.getTime())
    expect(actividad.fechaInicioPlan.getTime()).toBe(edt.fechaInicioPlan.getTime())
    expect(tarea1.fechaInicio.getTime()).toBe(actividad.fechaInicioPlan.getTime())
    expect(tarea2.fechaInicio.getTime()).toBeGreaterThanOrEqual(tarea1.fechaFin.getTime())
  })

  it('asigna orden secuencial (0,1,2...) dentro de cada nivel', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'A', 8), tarea('t2', 'B', 8)], origen: 'determinista' },
      { edtNombre: 'GES', actividadNombre: 'Documentos', tareas: [tarea('t3', 'C', 8)], origen: 'determinista' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })
    expect(r.actividades.map(a => a.orden)).toEqual([0, 1])
    const inicio = r.tareas.filter(t => t.proyectoActividadId === r.actividades[0].id)
    expect(inicio.map(t => t.orden)).toEqual([0, 1])
  })

  it('EDT sin match en el catálogo real se omite y genera advertencia (nunca revienta)', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'EDT-INEXISTENTE', actividadNombre: 'X', tareas: [tarea('t1', 'Y', 8)], origen: 'determinista' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })
    expect(r.fases).toHaveLength(0)
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('horasPlan de EDT/Actividad es la suma de las horas de sus tareas', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'A', 8), tarea('t2', 'B', 12)], origen: 'determinista' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })
    expect(r.edts[0].horasPlan).toBe(20)
    expect(r.actividades[0].horasPlan).toBe(20)
  })

  it('ordena los EDTs de una misma Fase por su Edt.orden real, NUNCA por el orden de llegada del array actividades (bug real: Comisionamiento salía antes que Construcción)', () => {
    // CMM aparece PRIMERO en el array de entrada (ej. determinista, ya
    // resuelto antes que CON que requiere IA) pero su edtOrden (3) es mayor
    // que el de CON (2) — CON debe quedar primero en fechas igual.
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'CMM', actividadNombre: 'Comisionamiento', tareas: [tarea('t1', 'Puesta en marcha', 8)], origen: 'determinista' },
      { edtNombre: 'CON', actividadNombre: 'Zona A', tareas: [tarea('t2', 'Tendido', 8)], origen: 'ia' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })

    expect(r.edts.map(e => e.nombre)).toEqual(['Construccion', 'Comisionamiento'])
    const con = r.edts.find(e => e.nombre === 'Construccion')!
    const cmm = r.edts.find(e => e.nombre === 'Comisionamiento')!
    expect(con.orden).toBeLessThan(cmm.orden)
    expect(con.fechaInicioPlan.getTime()).toBeLessThanOrEqual(cmm.fechaInicioPlan.getTime())
    expect(cmm.fechaInicioPlan.getTime()).toBeGreaterThanOrEqual(con.fechaFinPlan.getTime())
  })

  it('REGRESIÓN apilamiento: Tareas de una misma Actividad que exceden 1 día NO quedan todas en el mismo día (bug real: CJM49, todo el 28-agosto)', () => {
    // 3 tareas de 8h c/u (horasPorDia=8) -> cada una consume exactamente 1
    // día completo. Con el bug viejo (cursorTarea = fechaFinTarea, Date
    // crudo encadenado) las 3 caían el mismo día porque
    // calcularFechaFinConCalendario le daba a cada una el presupuesto
    // COMPLETO del día sin importar la hora de inicio heredada.
    const actividades: ActividadPropuesta[] = [
      {
        edtNombre: 'GES',
        actividadNombre: 'Secuencial',
        tareas: [tarea('t1', 'Uno', 8), tarea('t2', 'Dos', 8), tarea('t3', 'Tres', 8)],
        origen: 'determinista',
      },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })

    const [t1, t2, t3] = r.tareas
    const diaDe = (d: Date) => d.toISOString().slice(0, 10)

    // La fecha de INICIO de la siguiente tarea puede coincidir con el
    // instante justo donde terminó la anterior (fin de jornada) — lo que
    // NUNCA debe pasar es que su fecha de FIN quede en el mismo día que la
    // anterior: eso era exactamente el bug (calcularFechaFinConCalendario
    // le daba a cada tarea el presupuesto COMPLETO del día sin importar
    // cuánto ya se había consumido).
    expect(diaDe(t1.fechaFin)).not.toBe(diaDe(t2.fechaFin))
    expect(diaDe(t2.fechaFin)).not.toBe(diaDe(t3.fechaFin))
    expect(t2.fechaInicio.getTime()).toBeGreaterThanOrEqual(t1.fechaFin.getTime())
    expect(t3.fechaInicio.getTime()).toBeGreaterThanOrEqual(t2.fechaFin.getTime())
    expect(t2.fechaFin.getTime()).toBeGreaterThan(t1.fechaFin.getTime())
    expect(t3.fechaFin.getTime()).toBeGreaterThan(t2.fechaFin.getTime())

    // La Actividad y el EDT deben reflejar el fin REAL de la última tarea
    // (no un agregado independiente que quedaría desalineado con sus hijos).
    const actividad = r.actividades[0]
    const edt = r.edts[0]
    expect(actividad.fechaFinPlan.getTime()).toBe(t3.fechaFin.getTime())
    expect(edt.fechaFinPlan.getTime()).toBe(actividad.fechaFinPlan.getTime())
  })

  it('mínimo 1 día por Tarea preservado: 2 tareas cortas (2h y 3h, horasPorDia=8) igual caen en días DISTINTOS, no se empaquetan (duracionDiasDesdeHoras redondea cada una a 1 día completo)', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Corta', tareas: [tarea('t1', 'Uno', 2), tarea('t2', 'Dos', 3)], origen: 'determinista' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })
    const [t1, t2] = r.tareas
    const diaDe = (d: Date) => d.toISOString().slice(0, 10)
    expect(diaDe(t1.fechaFin)).not.toBe(diaDe(t2.fechaFin))
    expect(t2.fechaInicio.getTime()).toBeGreaterThanOrEqual(t1.fechaFin.getTime())
    expect(t2.fechaFin.getTime()).toBeGreaterThan(t1.fechaFin.getTime())
  })

  it('propaga catalogoServicioId siempre, y recursoId solo si el servicio está en recursoPorServicio (nunca revienta con un id no resuelto)', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'Kickoff', 8), tarea('t2', 'RFI', 8)], origen: 'determinista' },
    ]
    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto,
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map([['t1', 'recurso-cadista']]),
    })

    const [t1, t2] = r.tareas
    expect(t1.catalogoServicioId).toBe('t1')
    expect(t1.recursoId).toBe('recurso-cadista')
    expect(t2.catalogoServicioId).toBe('t2')
    expect(t2.recursoId).toBeNull()
  })
})

describe('agruparYOrdenarPorEstructura — única fuente de verdad del orden, compartida por construirEstructuraReal y el preview del Paso 2', () => {
  // Mismo caso que el test de más arriba: CMM llega PRIMERO en el array de
  // entrada pero su edtOrden (3) es mayor que el de CON (2) — el orden
  // final debe ser Construccion -> Comisionamiento, no el de llegada.
  const actividades: ActividadPropuesta[] = [
    { edtNombre: 'CMM', actividadNombre: 'Comisionamiento', tareas: [tarea('t1', 'Puesta en marcha', 8)], origen: 'determinista' },
    { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t2', 'Kickoff', 8)], origen: 'determinista' },
    { edtNombre: 'CON', actividadNombre: 'Zona A', tareas: [tarea('t3', 'Tendido', 8)], origen: 'ia' },
  ]

  it('ordena por (faseOrden, edtOrden), preservando el orden de llegada de las Actividades dentro de cada EDT', () => {
    const { gruposOrdenados, advertencias } = agruparYOrdenarPorEstructura(actividades, EDTS_CATALOGO)
    expect(gruposOrdenados.map(g => g.edtInfo.nombre)).toEqual(['GES', 'CON', 'CMM'])
    expect(advertencias).toHaveLength(0)
  })

  it('un EDT sin match en el catálogo se omite del agrupado y genera advertencia (nunca revienta)', () => {
    const conEdtInexistente: ActividadPropuesta[] = [...actividades, { edtNombre: 'X', actividadNombre: 'Y', tareas: [], origen: 'determinista' }]
    const { gruposOrdenados, advertencias } = agruparYOrdenarPorEstructura(conEdtInexistente, EDTS_CATALOGO)
    expect(gruposOrdenados.map(g => g.edtInfo.nombre)).toEqual(['GES', 'CON', 'CMM'])
    expect(advertencias.length).toBeGreaterThan(0)
  })

  it('el orden final coincide EXACTAMENTE con el que produce construirEstructuraReal para el mismo input (el Paso 2 es un preview fiel)', () => {
    const { gruposOrdenados } = agruparYOrdenarPorEstructura(actividades, EDTS_CATALOGO)
    const ordenEsperado = gruposOrdenados.flatMap(g => g.actividades.map(a => a.actividadNombre))

    const r = construirEstructuraReal({
      actividades,
      edtsCatalogo: EDTS_CATALOGO,
      proyectoId: 'p1',
      proyectoCronogramaId: 'cron1',
      fechaInicioProyecto: new Date('2026-08-03T00:00:00'),
      calendarioLaboral: mockCalendario(),
      recursoPorServicio: new Map(),
    })

    expect(r.actividades.map(a => a.nombre)).toEqual(ordenEsperado)
    expect(ordenEsperado).toEqual(['Inicio', 'Zona A', 'Comisionamiento'])
  })

  it('funciona con un catálogo "liviano" (sin id/descripcionEdt) — lo que el Paso 2 del wizard puede armar sin fechas ni ids reales', () => {
    const catalogoLiviano = new Map(
      Array.from(EDTS_CATALOGO.entries()).map(([nombre, info]) => [
        nombre,
        { nombre: info.nombre, faseNombre: info.faseNombre, faseOrden: info.faseOrden, edtOrden: info.edtOrden },
      ])
    )
    const { gruposOrdenados } = agruparYOrdenarPorEstructura(actividades, catalogoLiviano)
    expect(gruposOrdenados.map(g => g.edtInfo.nombre)).toEqual(['GES', 'CON', 'CMM'])
  })
})
