import { agregarGeneralesCon, ACTIVIDAD_MOVILIZACION, ACTIVIDAD_DESMOVILIZACION, nombreConCliente } from '@/lib/cronogramaIA/generalesCon'
import { construirEstructuraReal, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
import type { ActividadPropuesta, CatalogoServicioParaWizard, TareaPropuesta } from '@/types/cronogramaIA'

const servicio = (id: string, nombre: string, horaBase: number, orden: number, actividadTag: string[]): CatalogoServicioParaWizard => ({
  id, nombre, descripcion: '', edtNombre: 'CON', actividadTag, filtroAlcance: 'general', notaCantidad: null,
  horaBase, horaRepetido: 0, cantidad: 1, nivelDificultad: 1, orden, unidadNombre: 'Evento', recursoNombre: 'Cuadrilla 2P',
})
// Las tablas del usuario (CJM52).
const SERVICIOS = [
  servicio('m1', 'Movilización de Personal, Equipos y Herramientas a Planta', 4, 100, ['Movilizacion']),
  servicio('m2', 'Reconocimiento de Zonas de Trabajo y Replanteo con el Cliente', 4, 101, ['Movilizacion']),
  servicio('m3', 'Habilitación de Zona de Acopio y Almacén Temporal en Planta', 4, 102, ['Movilizacion']),
  servicio('m4', 'Traslado de Materiales desde Almacén GYS a Planta', 4, 103, ['Movilizacion']),
  servicio('m5', 'Recepción y Traslado de Andamios a Planta', 3, 104, ['Movilizacion', 'Paralelo', 'Andamios']),
  servicio('m6', 'Señalización y Delimitación de Áreas de Trabajo', 2, 105, ['Movilizacion', 'Paralelo']),
  servicio('d1', 'Devolución de Andamios', 3, 110, ['Desmovilizacion', 'Andamios']),
  servicio('d2', 'Retiro de Sobrantes, Residuos y Almacén Temporal', 4, 111, ['Desmovilizacion']),
  servicio('d3', 'Desmovilización de Personal, Equipos y Herramientas', 4, 112, ['Desmovilizacion']),
  servicio('z1', 'Tendido de Cables', 1, 10, ['General']),
]
const CONFIG = { brownfield: false, ingenieriaDetalle: false, nPets: 0, tableros: [], plcs: [], hmiCantidad: 0 } as unknown as Parameters<typeof agregarGeneralesCon>[2]
const tarea = (id: string, nombre: string, horas: number): TareaPropuesta =>
  ({ catalogoServicioId: id, nombre, cantidad: 1, nivelDificultad: 1, horaBase: horas, horaRepetido: 0, horasEstimadas: horas, incluida: true, orden: 0 })
const zona = (nombre: string, tareas: TareaPropuesta[]): ActividadPropuesta => ({ edtNombre: 'CON', actividadNombre: nombre, origen: 'ia', tareas })

describe('agregarGeneralesCon', () => {
  it('movilización al inicio y desmovilización al final, con prefijo GEN y el cliente', () => {
    const r = agregarGeneralesCon(
      [zona('Zona A', [tarea('a', 'A - Armado de Andamios', 3), tarea('z1', 'A - Tendido de Cables', 8)]), zona('Zona B', [tarea('z1', 'B - Tendido', 8)])],
      SERVICIOS, CONFIG, 'NEXA RESOURCES',
    )
    expect(r.map(a => a.actividadNombre)).toEqual([ACTIVIDAD_MOVILIZACION, 'Zona A', 'Zona B', ACTIVIDAD_DESMOVILIZACION])
    expect(r[0].tareas.map(t => t.nombre)).toEqual([
      'GEN - Movilización de Personal, Equipos y Herramientas a Planta',
      'GEN - Reconocimiento de Zonas de Trabajo y Replanteo con NEXA',
      'GEN - Habilitación de Zona de Acopio y Almacén Temporal en Planta',
      'GEN - Traslado de Materiales desde Almacén GYS a Planta',
      'GEN - Recepción y Traslado de Andamios a Planta',
      'GEN - Señalización y Delimitación de Áreas de Trabajo',
    ])
    expect(r[0].tareas.map(t => !!t.paraleloConAnterior)).toEqual([false, false, false, false, true, true])
    expect(r[3].tareas.map(t => t.nombre)).toEqual([
      'GEN - Devolución de Andamios', 'GEN - Retiro de Sobrantes, Residuos y Almacén Temporal',
      'GEN - Desmovilización de Personal, Equipos y Herramientas',
    ])
  })

  it('sin andamios en las zonas, sin las tareas de andamios; es idempotente', () => {
    const una = agregarGeneralesCon([zona('Zona A', [tarea('z1', 'A - Tendido', 8)])], SERVICIOS, CONFIG, null)
    expect(una[0].tareas.some(t => /Andamios/.test(t.nombre))).toBe(false)
    expect(una[2].tareas.some(t => /Andamios/.test(t.nombre))).toBe(false)
    expect(una[0].tareas[1].nombre).toBe('GEN - Reconocimiento de Zonas de Trabajo y Replanteo con el Cliente')
    expect(agregarGeneralesCon(una, SERVICIOS, CONFIG, null).map(a => a.actividadNombre)).toEqual(una.map(a => a.actividadNombre))
  })

  it('sin servicios generales en el catálogo, no cambia nada', () => {
    const acts = [zona('Zona A', [tarea('z1', 'A - Tendido', 8)])]
    expect(agregarGeneralesCon(acts, SERVICIOS.slice(-1), CONFIG, 'NEXA')).toBe(acts)
  })

  it('nombreConCliente', () => {
    expect(nombreConCliente('Liberación con {CLIENTE} (acta)', 'nexa resources')).toBe('Liberación con NEXA (acta)')
  })
})

describe('construirEstructuraReal — Generales con tareas en paralelo', () => {
  const EDTS: Map<string, EdtCatalogoInfo> = new Map([
    ['CON', { id: 'edt-con', nombre: 'CON', descripcionEdt: 'Construcción', faseNombre: 'EJECUCION', faseOrden: 5, edtOrden: 0 }],
  ])
  const cal = { horasPorDia: 9.5, diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], horaInicioManana: '08:00', horaFinManana: '12:00', horaInicioTarde: '13:00', horaFinTarde: '18:30', diaCalendario: [], excepcionCalendario: [] }
  const acts = agregarGeneralesCon(
    [zona('Zona A', [tarea('a', 'A - Armado de Andamios', 3), tarea('z1', 'A - Tendido de Cables', 8)])],
    SERVICIOS, CONFIG, 'NEXA',
  )
  const r = construirEstructuraReal({
    actividades: acts, edtsCatalogo: EDTS, proyectoId: 'p', proyectoCronogramaId: 'c',
    fechaInicioProyecto: new Date('2026-12-01T00:00:00Z'), calendarioLaboral: cal, recursoPorServicio: new Map(),
  })
  const t = (n: string) => r.tareas.find(x => x.nombre === `GEN - ${n}`)!
  const pares = new Set(r.dependenciasCiclos.map(d => `${d.tareaOrigenId}>${d.tareaDependienteId}`))

  it('4, 5 y 6 dependen de la 3 y arrancan juntas', () => {
    const acopio = t('Habilitación de Zona de Acopio y Almacén Temporal en Planta')
    const traslado = t('Traslado de Materiales desde Almacén GYS a Planta')
    const andamios = t('Recepción y Traslado de Andamios a Planta')
    const senal = t('Señalización y Delimitación de Áreas de Trabajo')
    for (const x of [traslado, andamios, senal]) {
      expect(pares.has(`${acopio.id}>${x.id}`)).toBe(true)
      expect(x.fechaInicio.getTime()).toBe(traslado.fechaInicio.getTime())
    }
    expect(pares.has(`${t('Movilización de Personal, Equipos y Herramientas a Planta').id}>${t('Reconocimiento de Zonas de Trabajo y Replanteo con NEXA').id}`)).toBe(true)
  })

  it('desmovilización encadenada 1→2→3 y después de la última zona', () => {
    const d = ['Devolución de Andamios', 'Retiro de Sobrantes, Residuos y Almacén Temporal', 'Desmovilización de Personal, Equipos y Herramientas'].map(t)
    for (let i = 1; i < d.length; i++) expect(pares.has(`${d[i - 1].id}>${d[i].id}`)).toBe(true)
    const finZona = r.actividades.find(a => a.nombre === 'Zona A')!.fechaFinPlan
    expect(d[0].fechaInicio.getTime()).toBeGreaterThan(finZona.getTime())
  })

  it('la movilización termina antes de que empiece la zona', () => {
    const mov = r.actividades.find(a => a.nombre === ACTIVIDAD_MOVILIZACION)!
    const zonaA = r.actividades.find(a => a.nombre === 'Zona A')!
    expect(zonaA.fechaInicioPlan.getTime()).toBeGreaterThan(mov.fechaFinPlan.getTime())
  })
})
