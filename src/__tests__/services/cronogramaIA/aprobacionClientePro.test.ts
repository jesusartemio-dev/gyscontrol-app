import { aplicarAprobacionCliente, nombreHitoAprobacion } from '@/lib/cronogramaIA/aprobacionClientePro'
import { construirEstructuraReal, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
import type { ActividadPropuesta, CatalogoServicioParaWizard, TareaPropuesta } from '@/types/cronogramaIA'

const servicio = (id: string, nombre: string, horaBase: number, orden: number, actividadTag: string[] = []): CatalogoServicioParaWizard => ({
  id, nombre, descripcion: '', edtNombre: 'PRO', actividadTag, filtroAlcance: 'general', notaCantidad: null,
  horaBase, horaRepetido: 0, cantidad: 1, nivelDificultad: 1, orden, unidadNombre: 'Global', recursoNombre: 'Gestor',
})
// Catálogo PRO desde CJM52: los 5 pasos estándar (+ los viejos, marcados obsoletos).
const SERVICIOS = [
  servicio('cot', 'Cotización y Evaluación Técnica', 5, 0),
  servicio('apr', 'Aprobación Ficha Técnica', 0, 3),
  servicio('oc', 'Emisión de Orden de Compra', 0, 4, ['Hito']),
  servicio('pla', 'Plazo de Entrega del Proveedor', 2, 5),
  servicio('rec', 'Recepción e Inspección en Almacén GYS', 2, 6),
  servicio('tra', 'Traslado y Entrega en Sitio', 5, 7),
]
const CONFIG = { brownfield: false, ingenieriaDetalle: false, nPets: 0, tableros: [], plcs: [], hmiCantidad: 0 } as unknown as Parameters<typeof aplicarAprobacionCliente>[2]

function tarea(id: string, nombre: string, horas: number): TareaPropuesta {
  return { catalogoServicioId: id, nombre, cantidad: 1, nivelDificultad: 1, horaBase: horas, horaRepetido: 0, horasEstimadas: horas, incluida: true, orden: 0 }
}
/** Como la arma la IA a veces: con servicios viejos y sin algunos pasos. */
const familia = (alias: string, nombre: string, extra: TareaPropuesta[] = []): ActividadPropuesta => ({
  edtNombre: 'PRO', actividadNombre: nombre, origen: 'ia',
  tareas: [tarea('sol', `${alias} - Solicitud de Cotización`, 2), ...extra, tarea('oc', `${alias} - Emisión de Orden de Compra`, 1)],
})
const PASOS = (alias: string) => [
  `${alias} - Cotización y Evaluación Técnica`, `${alias} - Aprobación Ficha Técnica por NEXA`, `${alias} - Emisión de Orden de Compra`,
  `${alias} - Plazo de Entrega del Proveedor`, `${alias} - Recepción e Inspección en Almacén GYS`,
]

describe('aplicarAprobacionCliente — 5 pasos estándar en TODAS las familias', () => {
  it('materiales y equipos quedan con los mismos 5 pasos, en orden; lo viejo se descarta y lo demás va detrás', () => {
    const r = aplicarAprobacionCliente(
      [
        familia('Bandejas', 'Bandejas y Soportería', [tarea('eva', 'Bandejas - Evaluación Técnica', 2), tarea('exp', 'Bandejas - Seguimiento de Compra (Expediting)', 2)]),
        familia('Instrum', 'Instrumentos', [tarea('tra', 'Instrum - Traslado y Entrega en Sitio', 5)]),
      ],
      SERVICIOS, CONFIG, 'NEXA RESOURCES CAJAMARQUILLA S.A.',
    )
    expect(r[0].tareas.map(t => t.nombre)).toEqual(PASOS('Bandejas'))
    expect(r[1].tareas.map(t => t.nombre)).toEqual([...PASOS('Instrum'), 'Instrum - Traslado y Entrega en Sitio'])
    const [cot, apr, oc] = r[1].tareas
    expect(cot.horasEstimadas).toBe(5)
    expect(apr.esHito).toBeFalsy() // 1 día de espera, sin horas
    expect(apr.horasEstimadas).toBe(0)
    expect(oc.esHito).toBe(true)
    expect(oc.horasEstimadas).toBe(0)
  })

  it('no toca "Seguimiento y Entrega en Obra" ni otros EDT', () => {
    const otras: ActividadPropuesta[] = [
      { edtNombre: 'PRO', actividadNombre: 'Seguimiento y Entrega en Obra', origen: 'determinista', tareas: [tarea('tra', 'Entrega en Obra', 5)] },
      { edtNombre: 'SER', actividadNombre: 'Andamios', origen: 'ia', tareas: [tarea('x', 'Solicitud de Cotización', 2)] },
    ]
    expect(aplicarAprobacionCliente(otras, SERVICIOS, CONFIG, 'NEXA')).toEqual(otras)
  })

  it('sin los 5 servicios en el catálogo no cambia nada', () => {
    const acts = [familia('Instrum', 'Instrumentos')]
    expect(aplicarAprobacionCliente(acts, SERVICIOS.slice(0, 2), CONFIG, 'NEXA')).toBe(acts)
  })

  it('nombre de la aprobación con y sin cliente', () => {
    expect(nombreHitoAprobacion('NEXA RESOURCES')).toBe('Aprobación Ficha Técnica por NEXA')
    expect(nombreHitoAprobacion(null)).toBe('Aprobación Ficha Técnica')
  })
})

describe('construirEstructuraReal — alquiler de andamios anclado a la obra', () => {
  it('Movilización al inicio del primer armado y Desmovilización al fin del último desmontaje, con FC', () => {
    const EDTS: Map<string, EdtCatalogoInfo> = new Map([
      ['SER', { id: 'edt-ser', nombre: 'SER', descripcionEdt: 'Servicios y Alquileres', faseNombre: 'PROCURA', faseOrden: 4, edtOrden: 1 }],
      ['CON', { id: 'edt-con', nombre: 'CON', descripcionEdt: 'Construcción', faseNombre: 'EJECUCION', faseOrden: 5, edtOrden: 0 }],
    ])
    const cal = { horasPorDia: 9.5, diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], horaInicioManana: '08:00', horaFinManana: '12:00', horaInicioTarde: '13:00', horaFinTarde: '18:30', diaCalendario: [], excepcionCalendario: [] }
    const hito = (id: string, nombre: string): TareaPropuesta => ({ ...tarea(id, nombre, 0), esHito: true })
    const r = construirEstructuraReal({
      actividades: [
        { edtNombre: 'SER', actividadNombre: 'Alquiler de Andamios', origen: 'determinista', tareas: [
          tarea('s1', 'Solicitud y Evaluación de Cotizaciones', 3), tarea('s2', 'Emisión de Orden de Compra', 1),
          hito('s3', 'Movilización a Obra'), hito('s4', 'Desmovilización'),
        ] },
        { edtNombre: 'CON', actividadNombre: 'Zona A', origen: 'ia', tareas: [tarea('c1', 'A - Armado de Andamios', 3), tarea('c2', 'A - Tendido', 8), tarea('c3', 'A - Desmontaje de Andamios', 2)] },
        { edtNombre: 'CON', actividadNombre: 'Zona B', origen: 'ia', tareas: [tarea('c1', 'B - Armado de Andamios', 3), tarea('c3', 'B - Desmontaje de Andamios', 2)] },
      ],
      edtsCatalogo: EDTS, proyectoId: 'p', proyectoCronogramaId: 'c',
      fechaInicioProyecto: new Date('2026-10-22T00:00:00Z'), calendarioLaboral: cal, recursoPorServicio: new Map(),
    })
    const t = (n: string) => r.tareas.find(x => x.nombre === n)!
    const mov = t('Movilización a Obra')
    const desmov = t('Desmovilización')
    expect(mov.fechaInicio.getTime()).toBe(t('A - Armado de Andamios').fechaInicio.getTime())
    expect(desmov.fechaFin.getTime()).toBe(t('B - Desmontaje de Andamios').fechaFin.getTime())
    const pares = new Set(r.dependenciasCiclos.map(d => `${d.tareaOrigenId}>${d.tareaDependienteId}`))
    expect(pares.has(`${mov.id}>${t('A - Armado de Andamios').id}`)).toBe(true)
    expect(pares.has(`${mov.id}>${t('B - Armado de Andamios').id}`)).toBe(true)
    expect(pares.has(`${t('A - Desmontaje de Andamios').id}>${desmov.id}`)).toBe(true)
    expect(pares.has(`${t('B - Desmontaje de Andamios').id}>${desmov.id}`)).toBe(true)
    const ser = r.edts.find(e => e.edtId === 'edt-ser')!
    expect(ser.fechaFinPlan.getTime()).toBe(desmov.fechaFin.getTime())
  })
})

describe('construirEstructuraReal — 5 pasos de PRO', () => {
  it('aprobación de 1 día sin horas y ◆ OC al terminarla', () => {
    const EDTS: Map<string, EdtCatalogoInfo> = new Map([
      ['PRO', { id: 'edt-pro', nombre: 'PRO', descripcionEdt: 'Suministro de Equipos', faseNombre: 'PROCURA', faseOrden: 3, edtOrden: 0 }],
    ])
    const cal = { horasPorDia: 9.5, diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], horaInicioManana: '08:00', horaFinManana: '12:00', horaInicioTarde: '13:00', horaFinTarde: '18:30', diaCalendario: [], excepcionCalendario: [] }
    const acts = aplicarAprobacionCliente([familia('Instrum', 'Instrumentos')], SERVICIOS, CONFIG, 'NEXA')
    const r = construirEstructuraReal({
      actividades: acts, edtsCatalogo: EDTS, proyectoId: 'p', proyectoCronogramaId: 'c',
      fechaInicioProyecto: new Date('2026-10-22T00:00:00Z'), calendarioLaboral: cal, recursoPorServicio: new Map(),
    })
    const t = (n: string) => r.tareas.find(x => x.nombre === `Instrum - ${n}`)!
    const apr = t('Aprobación Ficha Técnica por NEXA')
    expect(apr.esHito).toBeFalsy()
    expect(apr.fechaFin.getTime()).toBeGreaterThan(apr.fechaInicio.getTime()) // ocupa su día
    const oc = t('Emisión de Orden de Compra')
    expect(oc.esHito).toBe(true)
    expect(oc.fechaInicio.getTime()).toBe(oc.fechaFin.getTime())
    expect(oc.fechaInicio.getTime()).toBe(apr.fechaFin.getTime())
    expect(t('Plazo de Entrega del Proveedor').fechaInicio.getTime()).toBeGreaterThanOrEqual(oc.fechaFin.getTime())
  })
})
