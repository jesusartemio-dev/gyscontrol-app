import { validarPropuestaGrupos, validarSugerenciasCantidad, validarPrellenadoPaso1 } from '@/lib/cronogramaIA/validarPropuestasIA'
import type { CatalogoServicioParaWizard, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'

function servicio(overrides: Partial<CatalogoServicioParaWizard> & { id: string; nombre: string }): CatalogoServicioParaWizard {
  return {
    descripcion: '',
    edtNombre: 'CON',
    actividadTag: [],
    filtroAlcance: 'general',
    notaCantidad: null,
    horaBase: 4,
    horaRepetido: 0,
    cantidad: 1,
    nivelDificultad: 1,
    unidadNombre: 'unidad',
    recursoNombre: 'Técnico',
    ...overrides,
  }
}

const config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'> = { brownfield: false, ingenieriaDetalle: false }

describe('validarPropuestaGrupos', () => {
  const servicios = [
    servicio({ id: 's1', nombre: 'Tendido de cables' }),
    servicio({ id: 's2', nombre: 'Montaje de tablero' }),
    servicio({ id: 's3', nombre: 'Pruebas de continuidad' }),
  ]

  it('agrupa tareas reales bajo los nombres de zona que propone la IA', () => {
    const r = validarPropuestaGrupos(
      [
        { nombre: 'Sala Eléctrica', catalogoServicioIds: ['s1', 's2'] },
        { nombre: 'Zona de Tanques', catalogoServicioIds: ['s3'] },
      ],
      servicios,
      config,
      'CON'
    )
    expect(r.actividades.map(a => a.actividadNombre)).toEqual(['Sala Eléctrica', 'Zona de Tanques'])
    expect(r.actividades[0].origen).toBe('ia')
    expect(r.tareaIdsInventados).toHaveLength(0)
    expect(r.tareaIdsNoAsignadas).toHaveLength(0)
  })

  it('descarta ids inventados por la IA y los reporta, sin romper el resto', () => {
    const r = validarPropuestaGrupos(
      [{ nombre: 'Sala Eléctrica', catalogoServicioIds: ['s1', 'id-inventado-por-la-ia'] }],
      servicios,
      config,
      'CON'
    )
    expect(r.tareaIdsInventados).toEqual(['id-inventado-por-la-ia'])
    expect(r.actividades[0].tareas.map(t => t.catalogoServicioId)).toEqual(['s1'])
  })

  it('tareas permitidas que la IA no asignó a ningún grupo caen en "Sin agrupar", nunca se pierden', () => {
    const r = validarPropuestaGrupos(
      [{ nombre: 'Sala Eléctrica', catalogoServicioIds: ['s1'] }],
      servicios,
      config,
      'CON'
    )
    const sinAgrupar = r.actividades.find(a => a.actividadNombre === 'Sin agrupar')
    expect(sinAgrupar).toBeTruthy()
    expect(sinAgrupar!.tareas.map(t => t.catalogoServicioId).sort()).toEqual(['s2', 's3'])
    expect(r.tareaIdsNoAsignadas.sort()).toEqual(['s2', 's3'])
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('la IA no devuelve nada (fallo total) — todo cae en "Sin agrupar", nunca se pierde una tarea', () => {
    const r = validarPropuestaGrupos([], servicios, config, 'CON')
    expect(r.actividades).toHaveLength(1)
    expect(r.actividades[0].actividadNombre).toBe('Sin agrupar')
    expect(r.actividades[0].tareas).toHaveLength(3)
  })

  it('grupos con nombre vacío se ignoran', () => {
    const r = validarPropuestaGrupos(
      [{ nombre: '  ', catalogoServicioIds: ['s1'] }],
      servicios,
      config,
      'CON'
    )
    expect(r.actividades.find(a => a.actividadNombre.trim() === '')).toBeUndefined()
  })
})

describe('validarSugerenciasCantidad', () => {
  const idsPermitidos = new Set(['s1', 's2'])

  it('acepta sugerencias válidas para ids permitidos', () => {
    const r = validarSugerenciasCantidad([{ catalogoServicioId: 's1', cantidad: 4 }], idsPermitidos)
    expect(r.cantidades.get('s1')).toBe(4)
    expect(r.advertencias).toHaveLength(0)
  })

  it('descarta sugerencias con id no permitido (posible alucinación)', () => {
    const r = validarSugerenciasCantidad([{ catalogoServicioId: 'id-inventado', cantidad: 4 }], idsPermitidos)
    expect(r.cantidades.size).toBe(0)
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('descarta cantidades no positivas o no finitas', () => {
    const r = validarSugerenciasCantidad(
      [
        { catalogoServicioId: 's1', cantidad: 0 },
        { catalogoServicioId: 's2', cantidad: NaN },
      ],
      idsPermitidos
    )
    expect(r.cantidades.size).toBe(0)
  })

  it('clampa cantidades absurdamente altas (anti-alucinación)', () => {
    const r = validarSugerenciasCantidad([{ catalogoServicioId: 's1', cantidad: 999999 }], idsPermitidos)
    expect(r.cantidades.get('s1')).toBe(500)
  })
})

describe('validarPrellenadoPaso1', () => {
  const edtsPermitidos = new Set(['edt-ges', 'edt-con'])

  it('acepta EDTs reales y descarta ids inventados', () => {
    const r = validarPrellenadoPaso1(
      { edtsSeleccionados: ['edt-ges', 'edt-inventado'], brownfield: true },
      edtsPermitidos
    )
    expect(r.sugerencia.edtsSeleccionados).toEqual(['edt-ges'])
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('booleans no-true se normalizan a false (nunca undefined)', () => {
    const r = validarPrellenadoPaso1({}, edtsPermitidos)
    expect(r.sugerencia.brownfield).toBe(false)
    expect(r.sugerencia.ingenieriaDetalle).toBe(false)
    expect(r.sugerencia.scada).toBe(false)
  })

  it('limpia nombres de tablero/PLC vacíos y duplicados', () => {
    const r = validarPrellenadoPaso1(
      { tableros: [{ nombre: 'TCO-1' }, { nombre: '  ' }, { nombre: 'TCO-1' }] },
      edtsPermitidos
    )
    expect(r.sugerencia.tableros).toEqual([{ nombre: 'TCO-1' }])
  })

  it('hmiCantidad negativa o no numérica cae a 0', () => {
    expect(validarPrellenadoPaso1({ hmiCantidad: -3 }, edtsPermitidos).sugerencia.hmiCantidad).toBe(0)
    expect(validarPrellenadoPaso1({ hmiCantidad: NaN }, edtsPermitidos).sugerencia.hmiCantidad).toBe(0)
  })

  it('hmiCantidad absurdamente alta se clampa (anti-alucinación)', () => {
    const r = validarPrellenadoPaso1({ hmiCantidad: 99999 }, edtsPermitidos)
    expect(r.sugerencia.hmiCantidad).toBe(50)
  })

  it('respuesta totalmente vacía nunca lanza — devuelve sugerencia neutra', () => {
    const r = validarPrellenadoPaso1({}, edtsPermitidos)
    expect(r.sugerencia.edtsSeleccionados).toEqual([])
    expect(r.sugerencia.tableros).toEqual([])
    expect(r.sugerencia.plcs).toEqual([])
  })
})
