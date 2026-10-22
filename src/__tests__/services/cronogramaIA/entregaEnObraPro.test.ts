import { agregarEntregaEnObra, ACTIVIDAD_ENTREGA_OBRA, HITO_MATERIALES_EN_OBRA } from '@/lib/cronogramaIA/entregaEnObraPro'
import { construirEstructuraReal, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
import type { ActividadPropuesta, TareaPropuesta } from '@/types/cronogramaIA'

function tarea(id: string, nombre: string, horas: number, orden = 0): TareaPropuesta {
  return { catalogoServicioId: id, nombre, cantidad: 1, nivelDificultad: 1, horaBase: horas, horaRepetido: 0, horasEstimadas: horas, incluida: true, orden }
}

const familia = (alias: string, nombre: string): ActividadPropuesta => ({
  edtNombre: 'PRO',
  actividadNombre: nombre,
  origen: 'ia',
  tareas: [
    tarea('cot', `${alias} - Solicitud de Cotización`, 2, 0),
    tarea('oc', `${alias} - Emisión de Orden de Compra`, 1, 1),
    tarea('exp', `${alias} - Seguimiento de Compra (Expediting)`, 2, 2),
    tarea('rec', `${alias} - Recepción en Almacén GYS`, 2, 3),
    tarea('tras', `${alias} - Traslado y Entrega en Sitio`, 5, 4),
  ],
})

describe('agregarEntregaEnObra', () => {
  it('quita el traslado de cada familia y agrega "Seguimiento y Entrega en Obra" al final', () => {
    const r = agregarEntregaEnObra([familia('Cables', 'Cables'), familia('Tuberías', 'Tuberías')])
    expect(r).toHaveLength(3)
    for (const a of r.slice(0, 2)) expect(a.tareas.some(t => t.nombre.includes('Traslado'))).toBe(false)
    const entrega = r[2]
    expect(entrega.actividadNombre).toBe(ACTIVIDAD_ENTREGA_OBRA)
    expect(entrega.tareas.map(t => t.nombre)).toEqual(['Seguimiento a Proveedores', 'Traslado a Obra'])
    expect(entrega.tareas[0].catalogoServicioId).toBe('exp') // recurso del expediting (Gestor)
    expect(entrega.tareas[1].catalogoServicioId).toBe('tras')
  })

  it('es idempotente y no toca otros EDTs', () => {
    const una = agregarEntregaEnObra([familia('Cables', 'Cables')])
    expect(agregarEntregaEnObra(una)).toBe(una)
    const con: ActividadPropuesta = { edtNombre: 'CON', actividadNombre: 'Zona', origen: 'ia', tareas: [tarea('x', 'Zona - Traslado y Entrega en Sitio', 5)] }
    expect(agregarEntregaEnObra([con])).toEqual([con])
  })
})

describe('construirEstructuraReal — PRO en paralelo con entrega en obra', () => {
  const EDTS: Map<string, EdtCatalogoInfo> = new Map([
    ['PRO', { id: 'edt-pro', nombre: 'PRO', descripcionEdt: 'Suministro de Equipos', faseNombre: 'PROCURA', faseOrden: 3, edtOrden: 0 }],
  ])
  const cal = { horasPorDia: 9.5, diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], horaInicioManana: '08:00', horaFinManana: '12:00', horaInicioTarde: '13:00', horaFinTarde: '18:30', diaCalendario: [], excepcionCalendario: [] }

  const construir = () => {
    const corta = familia('Cables', 'Cables')
    const larga: ActividadPropuesta = { ...familia('Tablero', 'Tablero'), tareas: familia('Tablero', 'Tablero').tareas.map(t => (t.nombre.includes('Expediting') ? { ...t, horasEstimadas: 40 } : t)) }
    return construirEstructuraReal({
      actividades: agregarEntregaEnObra([corta, larga]),
      edtsCatalogo: EDTS,
      proyectoId: 'p1',
      proyectoCronogramaId: 'c1',
      fechaInicioProyecto: new Date('2026-10-22T00:00:00Z'),
      calendarioLaboral: cal,
      recursoPorServicio: new Map([['exp', 'rec-gestor'], ['tras', 'rec-cuadrilla']]),
    })
  }

  it('las familias arrancan juntas al inicio del EDT (no en serie)', () => {
    const r = construir()
    const [cables, tablero] = r.actividades
    expect(cables.fechaInicioPlan.getTime()).toBe(tablero.fechaInicioPlan.getTime())
  })

  it('el traslado va después de la última recepción y termina con el hito "Materiales en Obra"', () => {
    const r = construir()
    const porNombre = (n: string) => r.tareas.find(t => t.nombre === n)!
    const recepcionTablero = porNombre('Tablero - Recepción en Almacén GYS')
    const traslado = porNombre('Traslado a Obra')
    const hito = porNombre(HITO_MATERIALES_EN_OBRA)
    const seguimiento = porNombre('Seguimiento a Proveedores')
    expect(traslado.fechaInicio.getTime()).toBeGreaterThanOrEqual(recepcionTablero.fechaFin.getTime())
    expect(hito.esHito).toBe(true)
    expect(hito.fechaInicio.getTime()).toBe(traslado.fechaFin.getTime())
    expect(seguimiento.fechaFin.getTime()).toBe(recepcionTablero.fechaFin.getTime())
    expect(traslado.recursoId).toBe('rec-cuadrilla')
    expect(seguimiento.recursoId).toBe('rec-gestor')
    // El EDT termina con la entrega en obra.
    expect(r.edts[0].fechaFinPlan.getTime()).toBe(hito.fechaFin.getTime())
  })

  it('dependencias FC: cadena de cada familia, recepciones → traslado → hito', () => {
    const r = construir()
    const id = (n: string) => r.tareas.find(t => t.nombre === n)!.id
    const pares = new Set(r.dependenciasCiclos.map(d => `${d.tareaOrigenId}>${d.tareaDependienteId}`))
    expect(pares.has(`${id('Cables - Solicitud de Cotización')}>${id('Cables - Emisión de Orden de Compra')}`)).toBe(true)
    expect(pares.has(`${id('Cables - Recepción en Almacén GYS')}>${id('Traslado a Obra')}`)).toBe(true)
    expect(pares.has(`${id('Tablero - Recepción en Almacén GYS')}>${id('Traslado a Obra')}`)).toBe(true)
    expect(pares.has(`${id('Traslado a Obra')}>${id(HITO_MATERIALES_EN_OBRA)}`)).toBe(true)
  })
})
