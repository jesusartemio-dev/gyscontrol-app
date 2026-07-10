import { construirEstructuraReal, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
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
    })

    expect(r.edts.map(e => e.nombre)).toEqual(['Construccion', 'Comisionamiento'])
    const con = r.edts.find(e => e.nombre === 'Construccion')!
    const cmm = r.edts.find(e => e.nombre === 'Comisionamiento')!
    expect(con.orden).toBeLessThan(cmm.orden)
    expect(con.fechaInicioPlan.getTime()).toBeLessThanOrEqual(cmm.fechaInicioPlan.getTime())
    expect(cmm.fechaInicioPlan.getTime()).toBeGreaterThanOrEqual(con.fechaFinPlan.getTime())
  })
})
