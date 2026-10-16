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
  ['PRO', { id: 'edt-pro', nombre: 'PRO', descripcionEdt: 'Procura', faseNombre: 'PLANIFICACION', faseOrden: 1, edtOrden: 1 }],
  ['SEG', { id: 'edt-seg', nombre: 'SEG', descripcionEdt: 'Seguridad', faseNombre: 'PLANIFICACION', faseOrden: 1, edtOrden: 2 }],
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

describe('construirEstructuraReal — PLANIFICACION en paralelo + Ingeniería gatillada por GES', () => {
  const fechaInicioProyecto = new Date('2026-08-03T00:00:00') // lunes

  it('GES, PRO y SEG (las 3 EDTs de PLANIFICACION) arrancan el MISMO día — nunca encadenadas entre sí', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'Kickoff', 40)], origen: 'determinista' },
      { edtNombre: 'PRO', actividadNombre: 'Compras', tareas: [tarea('t2', 'RFQ', 24)], origen: 'determinista' },
      { edtNombre: 'SEG', actividadNombre: 'Inducciones', tareas: [tarea('t3', 'Inducción', 8)], origen: 'determinista' },
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

    const ges = r.edts.find(e => e.nombre === 'Gestion del Proyecto')!
    const pro = r.edts.find(e => e.nombre === 'Procura')!
    const seg = r.edts.find(e => e.nombre === 'Seguridad')!
    expect(ges.fechaInicioPlan.getTime()).toBe(pro.fechaInicioPlan.getTime())
    expect(pro.fechaInicioPlan.getTime()).toBe(seg.fechaInicioPlan.getTime())
    // Duraciones distintas (40h=5 días, 24h=3 días, 8h=1 día) -> fines distintos.
    expect(ges.fechaFinPlan.getTime()).toBeGreaterThan(seg.fechaFinPlan.getTime())
  })

  it('la fila de la Fase PLANIFICACION usa el fin MÁXIMO entre sus 3 EDTs, no el de la última procesada', () => {
    // SEG (última en edtOrden) es la más CORTA -> si el código todavía
    // sobreescribiera fechaFinFase con "la última procesada", la Fase
    // quedaría con el fin de SEG (corto) en vez del real (GES, largo).
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'Kickoff', 40)], origen: 'determinista' },
      { edtNombre: 'PRO', actividadNombre: 'Compras', tareas: [tarea('t2', 'RFQ', 24)], origen: 'determinista' },
      { edtNombre: 'SEG', actividadNombre: 'Inducciones', tareas: [tarea('t3', 'Inducción', 8)], origen: 'determinista' },
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

    const ges = r.edts.find(e => e.nombre === 'Gestion del Proyecto')!
    const fasePlanificacion = r.fases.find(f => f.nombre === 'PLANIFICACION')!
    expect(fasePlanificacion.fechaFinPlan.getTime()).toBe(ges.fechaFinPlan.getTime())
  })

  it('INGENIERIA arranca justo después de GES específicamente, NO después del fin de toda PLANIFICACION (que termina más tarde por SEG/PRO)', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'Kickoff', 8)], origen: 'determinista' }, // 1 día — el más corto
      { edtNombre: 'PRO', actividadNombre: 'Compras', tareas: [tarea('t2', 'RFQ', 24)], origen: 'determinista' }, // 3 días
      { edtNombre: 'SEG', actividadNombre: 'Inducciones', tareas: [tarea('t3', 'Inducción', 40)], origen: 'determinista' }, // 5 días
      { edtNombre: 'ING', actividadNombre: 'Diseño', tareas: [tarea('t4', 'Diseño', 8)], origen: 'determinista' },
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

    const ges = r.edts.find(e => e.nombre === 'Gestion del Proyecto')!
    const seg = r.edts.find(e => e.nombre === 'Seguridad')!
    const ing = r.edts.find(e => e.nombre === 'Ingenieria de Detalle')!

    // Arranca después de GES (el gatillo), no después de SEG (que corre en paralelo y termina más tarde).
    expect(ing.fechaInicioPlan.getTime()).toBeGreaterThan(ges.fechaFinPlan.getTime())
    expect(ing.fechaInicioPlan.getTime()).toBeLessThan(seg.fechaFinPlan.getTime())
  })

  it('REGRESIÓN: fases sin gatillo configurado (ej. EJECUCION) siguen estrictamente secuenciales — Construccion arranca después de Comisionamiento del mismo EDT/orden real', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'CON', actividadNombre: 'Zona A', tareas: [tarea('t1', 'Tendido', 40)], origen: 'ia' },
      { edtNombre: 'CMM', actividadNombre: 'Comisionamiento', tareas: [tarea('t2', 'Puesta en marcha', 8)], origen: 'determinista' },
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

    const con = r.edts.find(e => e.nombre === 'Construccion')!
    const cmm = r.edts.find(e => e.nombre === 'Comisionamiento')!
    // Secuencial de siempre: CMM arranca DESPUÉS de que CON termina (nunca el mismo día).
    expect(cmm.fechaInicioPlan.getTime()).toBeGreaterThanOrEqual(con.fechaFinPlan.getTime())
  })

  it('fallback: si GES no está incluido en la generación, la fase siguiente igual arranca (cae al fin real de PLANIFICACION, sin reventar)', () => {
    const actividades: ActividadPropuesta[] = [
      { edtNombre: 'SEG', actividadNombre: 'Inducciones', tareas: [tarea('t1', 'Inducción', 8)], origen: 'determinista' },
      { edtNombre: 'ING', actividadNombre: 'Diseño', tareas: [tarea('t2', 'Diseño', 8)], origen: 'determinista' },
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

    const seg = r.edts.find(e => e.nombre === 'Seguridad')!
    const ing = r.edts.find(e => e.nombre === 'Ingenieria de Detalle')!
    expect(ing.fechaInicioPlan.getTime()).toBeGreaterThanOrEqual(seg.fechaFinPlan.getTime())
  })
})

describe('construirEstructuraReal — GESTION Y CONTROL transversal y PROCURA en paralelo', () => {
  const fechaInicioProyecto = new Date('2026-08-03T00:00:00') // lunes
  // Catálogo nuevo: CTL en su fase transversal, PRO en la fase PROCURA.
  const CATALOGO = new Map<string, EdtCatalogoInfo>([
    ['GES', { id: 'edt-ges', nombre: 'GES', descripcionEdt: 'Planificación del Proyecto', faseNombre: 'PLANIFICACION', faseOrden: 0, edtOrden: 0 }],
    ['SEG', { id: 'edt-seg', nombre: 'SEG', descripcionEdt: 'Seguridad', faseNombre: 'PLANIFICACION', faseOrden: 0, edtOrden: 1 }],
    ['CTL', { id: 'edt-ctl', nombre: 'CTL', descripcionEdt: 'Control', faseNombre: 'GESTION Y CONTROL', faseOrden: 1, edtOrden: 0 }],
    ['SSO', { id: 'edt-sso', nombre: 'SSO', descripcionEdt: 'Gestión de Seguridad', faseNombre: 'GESTION Y CONTROL', faseOrden: 1, edtOrden: 1 }],
    ['ING', { id: 'edt-ing', nombre: 'ING', descripcionEdt: 'Ingenieria', faseNombre: 'INGENIERIA', faseOrden: 2, edtOrden: 0 }],
    ['PRO', { id: 'edt-pro', nombre: 'PRO', descripcionEdt: 'Procura', faseNombre: 'PROCURA', faseOrden: 3, edtOrden: 0 }],
    ['CON', { id: 'edt-con', nombre: 'CON', descripcionEdt: 'Construccion', faseNombre: 'EJECUCION', faseOrden: 4, edtOrden: 0 }],
    ['CIE', { id: 'edt-cie', nombre: 'CIE', descripcionEdt: 'Cierre', faseNombre: 'CIERRE', faseOrden: 5, edtOrden: 0 }],
  ])
  const construir = () => construirEstructuraReal({
    actividades: [
      { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [tarea('t1', 'Kickoff', 24)], origen: 'determinista' }, // 3 días
      { edtNombre: 'SEG', actividadNombre: 'Documentos de Seguridad', tareas: [tarea('t2', 'IPERC', 40)], origen: 'determinista' }, // 5 días
      { edtNombre: 'CTL', actividadNombre: 'Reporte Avance Semanal', tareas: [tarea('r1', 'Elaboración de Reporte Semanal', 2), tarea('r2', 'Envío de Reporte Semanal', 0.5, 1)], origen: 'determinista' },
      { edtNombre: 'CTL', actividadNombre: 'Valorizaciones', tareas: [tarea('v1', 'Elaboración de Valorización', 4), tarea('v2', 'Envío de Valorización', 0.5, 1), tarea('v3', 'Aprobación de Valorización', 0.5, 2), tarea('v4', 'Recepción de Conformidad HES', 0.5, 3)], origen: 'determinista' },
      { edtNombre: 'SSO', actividadNombre: 'Habilitación de Personal', tareas: [tarea('h1', 'Solicitud de Validación de OC', 1), tarea('h2', 'Solicitud Ingreso Personal SPOT', 1, 1), tarea('h3', 'Habilitación de Personal Sistema Rainbow', 1, 2)], origen: 'determinista' },
      { edtNombre: 'ING', actividadNombre: 'Diseño', tareas: [tarea('t5', 'Diseño', 40)], origen: 'determinista' },
      { edtNombre: 'PRO', actividadNombre: 'Cables', tareas: [tarea('t6', 'Compra', 80)], origen: 'determinista' }, // 10 días
      { edtNombre: 'CON', actividadNombre: 'Obra', tareas: [tarea('t7', 'Montaje', 120)], origen: 'determinista' }, // 15 días: la ventana incluye un día 20
      { edtNombre: 'CIE', actividadNombre: 'Cierre', tareas: [tarea('t8', 'Acta', 8)], origen: 'determinista' },
    ],
    edtsCatalogo: CATALOGO,
    proyectoId: 'p1',
    proyectoCronogramaId: 'cron1',
    fechaInicioProyecto,
    calendarioLaboral: mockCalendario(),
    recursoPorServicio: new Map(),
  })
  const edt = (r: ReturnType<typeof construir>, nombre: string) => r.edts.find(e => e.nombre === nombre)!
  const fase = (r: ReturnType<typeof construir>, nombre: string) => r.fases.find(f => f.nombre === nombre)!

  it('reportes semanales: un ciclo por viernes de la ventana (fin de GES → fin de Ejecución), numerados y encadenados el mismo día', () => {
    const r = construir()
    const elab = r.tareas.filter(t => t.catalogoServicioId === 'r1').sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())
    const envio = r.tareas.filter(t => t.catalogoServicioId === 'r2').sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())
    expect(elab.length).toBeGreaterThanOrEqual(3)
    expect(envio.length).toBe(elab.length)
    elab.forEach((t, i) => {
      const nn = String(i + 1).padStart(2, '0')
      expect(t.nombre).toBe(`Elaboración de Reporte Semanal ${nn}`)
      expect(envio[i].nombre).toBe(`Envío de Reporte Semanal ${nn}`)
      expect(t.fechaInicio.getUTCDay()).toBe(5) // viernes
      expect(t.fechaInicio.getUTCHours()).toBe(8)
      expect(t.horasEstimadas).toBe(2)
      expect(envio[i].fechaInicio.getTime()).toBe(t.fechaFin.getTime()) // Envío justo después, mismo día
      expect(envio[i].horasEstimadas).toBe(0.5)
      expect(r.dependenciasCiclos).toContainEqual({ tareaOrigenId: t.id, tareaDependienteId: envio[i].id, tipo: 'finish_to_start' })
    })
    // Dentro de la ventana
    const ctl = edt(r, 'Control')
    expect(ctl.fechaInicioPlan.getTime()).toBeGreaterThan(edt(r, 'Planificación del Proyecto').fechaFinPlan.getTime())
    expect(elab[elab.length - 1].fechaInicio.getTime()).toBeLessThanOrEqual(fase(r, 'EJECUCION').fechaFinPlan.getTime())
  })

  it('valorizaciones: un ciclo cada día 20, con sus 4 tareas en cadena', () => {
    const r = construir()
    const ciclo = ['v1', 'v2', 'v3', 'v4'].map(id => r.tareas.filter(t => t.catalogoServicioId === id))
    expect(ciclo[0].length).toBe(1)
    const [elab, envio, aprob, hes] = ciclo.map(l => l[0])
    expect(elab.nombre).toBe('Elaboración de Valorización 01')
    expect(hes.nombre).toBe('Recepción de Conformidad HES 01')
    expect(elab.fechaInicio.getUTCDate()).toBe(20)
    // Cada una empieza cuando termina la anterior (tras el almuerzo si cae a las 12:00), el mismo día.
    for (const [ant, sig] of [[elab, envio], [envio, aprob], [aprob, hes]]) {
      expect(sig.fechaInicio.getTime()).toBeGreaterThanOrEqual(ant.fechaFin.getTime())
      expect(sig.fechaInicio.getUTCDate()).toBe(20)
    }
  })

  it('SSO: habilitación de personal una sola vez, al inicio de la ventana, en cadena', () => {
    const r = construir()
    const h = ['h1', 'h2', 'h3'].map(id => r.tareas.filter(t => t.catalogoServicioId === id))
    h.forEach(l => expect(l.length).toBe(1))
    expect(h[0][0].nombre).toBe('Solicitud de Validación de OC') // sin numerar
    expect(h[1][0].fechaInicio.getTime()).toBe(h[0][0].fechaFin.getTime())
    expect(fase(r, 'GESTION Y CONTROL').fechaInicioPlan.getTime()).toBe(h[0][0].fechaInicio.getTime())
  })

  it('PROCURA arranca al terminar toda Planificación y no retrasa a Ejecución', () => {
    const r = construir()
    const pro = edt(r, 'Procura')
    expect(pro.fechaInicioPlan.getTime()).toBeGreaterThan(fase(r, 'PLANIFICACION').fechaFinPlan.getTime())
    // Ejecución sigue a Ingeniería aunque Procura termine después.
    const ing = edt(r, 'Ingenieria')
    const con = edt(r, 'Construccion')
    expect(con.fechaInicioPlan.getTime()).toBeGreaterThan(ing.fechaFinPlan.getTime())
    expect(con.fechaInicioPlan.getTime()).toBeLessThan(pro.fechaFinPlan.getTime())
  })

  it('INGENIERIA arranca tras GES (no espera a SEG) y CIERRE tras Ejecución', () => {
    const r = construir()
    expect(edt(r, 'Ingenieria').fechaInicioPlan.getTime()).toBeGreaterThan(edt(r, 'Planificación del Proyecto').fechaFinPlan.getTime())
    expect(edt(r, 'Ingenieria').fechaInicioPlan.getTime()).toBeLessThan(edt(r, 'Seguridad').fechaFinPlan.getTime())
    expect(edt(r, 'Cierre').fechaInicioPlan.getTime()).toBeGreaterThan(fase(r, 'EJECUCION').fechaFinPlan.getTime())
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
