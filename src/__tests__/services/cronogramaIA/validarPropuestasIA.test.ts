import {
  validarPropuestaGrupos,
  validarSugerenciasCantidad,
  validarPrellenadoPaso1,
  validarAsignacionEsquema,
  validarTareasNuevasPropuestas,
} from '@/lib/cronogramaIA/validarPropuestasIA'
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'

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
    orden: 0,
    unidadNombre: 'unidad',
    recursoNombre: 'Técnico',
    ...overrides,
  }
}

const config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle' | 'nPets' | 'tableros' | 'plcs' | 'hmiCantidad'> = {
  brownfield: false,
  ingenieriaDetalle: false,
  nPets: 0,
  tableros: [],
  plcs: [],
  hmiCantidad: 0,
}

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

  it('con 2+ grupos reales, prefija sus tareas con el alias de cada uno pero NUNCA prefija "Sin agrupar"', () => {
    const r = validarPropuestaGrupos(
      [
        { nombre: 'Sala Eléctrica', catalogoServicioIds: ['s1'] },
        { nombre: 'Zona de Tanques', catalogoServicioIds: ['s2'] },
      ],
      servicios,
      config,
      'CON'
    )
    const sala = r.actividades.find(a => a.actividadNombre === 'Sala Eléctrica')!
    const sinAgrupar = r.actividades.find(a => a.actividadNombre === 'Sin agrupar')!
    expect(sala.tareas[0].nombre).not.toBe('Tendido de cables')
    expect(sala.tareas[0].nombre.endsWith(' - Tendido de cables')).toBe(true)
    expect(sinAgrupar.tareas[0].nombre).toBe('Pruebas de continuidad')
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

  it('las tareas de un grupo se ordenan por el orden real del catálogo, no por el orden en que la IA las listó', () => {
    const serviciosConOrden = [
      servicio({ id: 's1', nombre: 'Tendido de cables', orden: 3 }),
      servicio({ id: 's2', nombre: 'Montaje de tablero', orden: 0 }),
      servicio({ id: 's3', nombre: 'Pruebas de continuidad', orden: 5 }),
    ]
    const r = validarPropuestaGrupos(
      [{ nombre: 'Sala Eléctrica', catalogoServicioIds: ['s3', 's1', 's2'] }],
      serviciosConOrden,
      config,
      'CON'
    )
    expect(r.actividades[0].tareas.map(t => t.catalogoServicioId)).toEqual(['s2', 's1', 's3'])
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

describe('validarAsignacionEsquema — Etapa B del flujo de esquemas (CON/PRO)', () => {
  const servicios = [
    servicio({ id: 's1', nombre: 'Tendido de cables' }),
    servicio({ id: 's2', nombre: 'Montaje de tablero' }),
    servicio({ id: 's3', nombre: 'Pruebas de continuidad' }),
  ]
  const nombresActividades = [
    { nombre: 'Sala Eléctrica', alias: 'Sala' },
    { nombre: 'Zona de Tanques', alias: 'Tanques' },
  ]

  it('asigna tareas a los nombres fijos del esquema elegido', () => {
    const r = validarAsignacionEsquema(
      [
        { actividadNombre: 'Sala Eléctrica', catalogoServicioIds: ['s1', 's2'] },
        { actividadNombre: 'Zona de Tanques', catalogoServicioIds: ['s3'] },
      ],
      nombresActividades,
      servicios,
      config,
      'CON'
    )
    expect(r.actividades.find(a => a.actividadNombre === 'Sala Eléctrica')?.tareas).toHaveLength(2)
    expect(r.actividades.find(a => a.actividadNombre === 'Zona de Tanques')?.tareas).toHaveLength(1)
    expect(r.advertencias).toHaveLength(0)
  })

  it('con 2+ Actividades reales, prefija el nombre de cada tarea con el alias de su Actividad', () => {
    const r = validarAsignacionEsquema(
      [
        { actividadNombre: 'Sala Eléctrica', catalogoServicioIds: ['s1', 's2'] },
        { actividadNombre: 'Zona de Tanques', catalogoServicioIds: ['s3'] },
      ],
      nombresActividades,
      servicios,
      config,
      'CON'
    )
    const sala = r.actividades.find(a => a.actividadNombre === 'Sala Eléctrica')!
    const tanques = r.actividades.find(a => a.actividadNombre === 'Zona de Tanques')!
    expect(sala.tareas.map(t => t.nombre)).toEqual(['Sala - Tendido de cables', 'Sala - Montaje de tablero'])
    expect(tanques.tareas.map(t => t.nombre)).toEqual(['Tanques - Pruebas de continuidad'])
  })

  it('un actividadNombre inventado (fuera del esquema elegido) se descarta — sus tareas caen en "Sin agrupar", nunca se pierden', () => {
    const r = validarAsignacionEsquema(
      [
        { actividadNombre: 'Zona Inventada', catalogoServicioIds: ['s1'] },
        { actividadNombre: 'Sala Eléctrica', catalogoServicioIds: ['s2', 's3'] },
      ],
      nombresActividades,
      servicios,
      config,
      'CON'
    )
    const sinAgrupar = r.actividades.find(a => a.actividadNombre === 'Sin agrupar')
    expect(sinAgrupar?.tareas.map(t => t.catalogoServicioId)).toEqual(['s1'])
    expect(r.advertencias.some(a => a.includes('no estaba en el esquema elegido'))).toBe(true)
  })

  it('un nombre del esquema elegido que queda sin ninguna tarea asignada se preserva como Actividad vacía (para poder mover tareas ahí manualmente después)', () => {
    const r = validarAsignacionEsquema(
      [{ actividadNombre: 'Sala Eléctrica', catalogoServicioIds: ['s1', 's2', 's3'] }],
      nombresActividades,
      servicios,
      config,
      'CON'
    )
    const zonaVacia = r.actividades.find(a => a.actividadNombre === 'Zona de Tanques')
    expect(zonaVacia).toBeTruthy()
    expect(zonaVacia?.tareas).toEqual([])
  })

  it('un id inventado por la IA se descarta igual que en validarPropuestaGrupos (reutiliza el mismo guardrail)', () => {
    const r = validarAsignacionEsquema(
      [{ actividadNombre: 'Sala Eléctrica', catalogoServicioIds: ['s1', 'id-inventado'] }],
      nombresActividades,
      servicios,
      config,
      'CON'
    )
    expect(r.tareaIdsInventados).toEqual(['id-inventado'])
  })
})

describe('validarTareasNuevasPropuestas — canal separado de tareas fuera del catálogo', () => {
  const catalogoCompleto = [
    { id: 'c1', nombre: 'Tendido de cables' },
    { id: 'c2', nombre: 'Protocolo de Megado' },
  ]

  function actividad(nombre: string): ActividadPropuesta {
    return { edtNombre: 'CON', actividadNombre: nombre, origen: 'ia', tareas: [] }
  }

  it('una tarea nueva legítima (sin duplicado en el catálogo) se agrega con catalogoServicioId null, esPropuestaIA true e incluida false (opt-in)', () => {
    const r = validarTareasNuevasPropuestas(
      [{ actividadDestino: 'Sala Eléctrica', nombre: 'Instalación de Sensores de Vibración', justificacion: 'el alcance menciona monitoreo de vibración' }],
      [actividad('Sala Eléctrica')],
      catalogoCompleto,
      'CON'
    )
    const tarea = r.actividades[0].tareas[0]
    expect(tarea.catalogoServicioId).toBeNull()
    expect(tarea.esPropuestaIA).toBe(true)
    expect(tarea.incluida).toBe(false)
    expect(tarea.justificacion).toBe('el alcance menciona monitoreo de vibración')
    expect(r.advertencias).toHaveLength(0)
  })

  it('anti-duplicado: una tarea que se parece a una existente del catálogo se descarta con advertencia, nunca se crea', () => {
    const r = validarTareasNuevasPropuestas(
      [{ actividadDestino: 'Sala Eléctrica', nombre: 'Protocolo de Megado de cableado', justificacion: 'verificar aislamiento' }],
      [actividad('Sala Eléctrica')],
      catalogoCompleto,
      'CON'
    )
    expect(r.actividades[0].tareas).toHaveLength(0)
    expect(r.advertencias.some(a => a.includes('se parece a la tarea de catálogo existente') && a.includes('Protocolo de Megado'))).toBe(true)
  })

  it('una tarea que apunta a una Actividad que no existe en el esquema se descarta con advertencia', () => {
    const r = validarTareasNuevasPropuestas(
      [{ actividadDestino: 'Zona Inexistente', nombre: 'Instalación de Sensores', justificacion: 'x' }],
      [actividad('Sala Eléctrica')],
      catalogoCompleto,
      'CON'
    )
    expect(r.actividades[0].tareas).toHaveLength(0)
    expect(r.advertencias.some(a => a.includes('no existe en el esquema'))).toBe(true)
  })

  it('límite de 5 tareas nuevas por generación — el resto se recorta con advertencia', () => {
    const propuestas = Array.from({ length: 7 }, (_, i) => ({
      actividadDestino: 'Sala Eléctrica',
      nombre: `Tarea nueva completamente distinta número ${i}`,
      justificacion: 'x',
    }))
    const r = validarTareasNuevasPropuestas(propuestas, [actividad('Sala Eléctrica')], catalogoCompleto, 'CON')
    expect(r.actividades[0].tareas).toHaveLength(5)
    expect(r.advertencias.some(a => a.includes('se recortó a las primeras 5'))).toBe(true)
  })

  it('sin tareas nuevas propuestas, las actividades quedan intactas', () => {
    const original = [actividad('Sala Eléctrica')]
    const r = validarTareasNuevasPropuestas([], original, catalogoCompleto, 'CON')
    expect(r.actividades).toEqual(original)
    expect(r.advertencias).toHaveLength(0)
  })
})
