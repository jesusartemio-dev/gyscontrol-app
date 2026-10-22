import { aplicarAprobacionCliente, familiaRequiereAprobacion, nombreHitoAprobacion } from '@/lib/cronogramaIA/aprobacionClientePro'
import { construirEstructuraReal, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
import type { ActividadPropuesta, CatalogoServicioParaWizard, TareaPropuesta } from '@/types/cronogramaIA'

const servicio = (id: string, nombre: string, horaBase: number, orden: number, actividadTag: string[] = []): CatalogoServicioParaWizard => ({
  id, nombre, descripcion: '', edtNombre: 'PRO', actividadTag, filtroAlcance: 'general', notaCantidad: null,
  horaBase, horaRepetido: 0, cantidad: 1, nivelDificultad: 1, orden, unidadNombre: 'Global', recursoNombre: 'Gestor',
})
const SERVICIOS = [
  servicio('sol', 'Solicitud de Cotización', 2, 0),
  servicio('rec', 'Recepción de Cotizaciones', 1, 1),
  servicio('eva', 'Evaluación Técnica', 2, 2),
  servicio('apr', 'Aprobación del Cliente', 0, 3, ['Hito']),
  servicio('oc', 'Emisión de Orden de Compra', 1, 4),
]
const CONFIG = { brownfield: false, ingenieriaDetalle: false, nPets: 0, tableros: [], plcs: [], hmiCantidad: 0 } as unknown as Parameters<typeof aplicarAprobacionCliente>[2]

function tarea(id: string, nombre: string, horas: number): TareaPropuesta {
  return { catalogoServicioId: id, nombre, cantidad: 1, nivelDificultad: 1, horaBase: horas, horaRepetido: 0, horasEstimadas: horas, incluida: true, orden: 0 }
}
const familia = (alias: string, nombre: string, extra: TareaPropuesta[] = []): ActividadPropuesta => ({
  edtNombre: 'PRO', actividadNombre: nombre, origen: 'ia',
  tareas: [tarea('sol', `${alias} - Solicitud de Cotización`, 2), ...extra, tarea('oc', `${alias} - Emisión de Orden de Compra`, 1)],
})

describe('familiaRequiereAprobacion', () => {
  it('equipos e instrumentos sí; materiales estándar no', () => {
    for (const n of ['Equipos Eléctricos', 'Instrumentos', 'Equipos de Control', 'Tableros', 'Instrumentos – Válvulas Automáticas', 'Equipos Eléctricos – Schneider'])
      expect(familiaRequiereAprobacion(n)).toBe(true)
    for (const n of ['Cables', 'Tuberías y Canalización', 'Bandejas y Soportería', 'Materiales de Tablero', 'Comunicación'])
      expect(familiaRequiereAprobacion(n)).toBe(false)
  })
})

describe('aplicarAprobacionCliente', () => {
  it('inserta Recepción → Evaluación → ◆ Aprobación por NEXA tras la cotización, solo en equipos/instrumentos', () => {
    // La IA puso la evaluación en Cables: se quita de ahí.
    const r = aplicarAprobacionCliente(
      [familia('Cables', 'Cables', [tarea('eva', 'Cables - Evaluación Técnica', 2)]), familia('Instrum', 'Instrumentos')],
      SERVICIOS, CONFIG, 'NEXA RESOURCES CAJAMARQUILLA S.A.',
    )
    expect(r[0].tareas.map(t => t.nombre)).toEqual(['Cables - Solicitud de Cotización', 'Cables - Emisión de Orden de Compra'])
    expect(r[1].tareas.map(t => t.nombre)).toEqual([
      'Instrum - Solicitud de Cotización', 'Instrum - Recepción de Cotizaciones', 'Instrum - Evaluación Técnica',
      'Instrum - Aprobación por NEXA', 'Instrum - Emisión de Orden de Compra',
    ])
    const hito = r[1].tareas[3]
    expect(hito.esHito).toBe(true)
    expect(hito.horasEstimadas).toBe(0)
  })

  it('sin esos servicios en el catálogo no cambia nada', () => {
    const acts = [familia('Instrum', 'Instrumentos')]
    expect(aplicarAprobacionCliente(acts, SERVICIOS.slice(0, 1), CONFIG, 'NEXA')).toBe(acts)
  })

  it('nombre del hito sin cliente', () => {
    expect(nombreHitoAprobacion(null)).toBe('Aprobación del Cliente')
  })
})

describe('construirEstructuraReal — hito de catálogo', () => {
  it('el hito dura 0 días y cae al terminar la tarea anterior', () => {
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
    const hito = t('Aprobación por NEXA')
    expect(hito.esHito).toBe(true)
    expect(hito.fechaInicio.getTime()).toBe(hito.fechaFin.getTime())
    expect(hito.fechaInicio.getTime()).toBe(t('Evaluación Técnica').fechaFin.getTime())
    expect(t('Emisión de Orden de Compra').fechaInicio.getTime()).toBeGreaterThanOrEqual(hito.fechaFin.getTime())
  })
})
