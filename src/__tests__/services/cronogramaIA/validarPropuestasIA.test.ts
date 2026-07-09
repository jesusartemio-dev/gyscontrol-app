import { validarPropuestaGrupos, validarSugerenciasCantidad } from '@/lib/cronogramaIA/validarPropuestasIA'
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
