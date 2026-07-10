import {
  calcularHorasEstimadas,
  evaluarAlcance,
  generarActividadesDeterministas,
  calcularEdtsPendientesIA,
  type EdtParaGenerar,
} from '@/lib/cronogramaIA/reglasActividades'
import type { CatalogoServicioParaWizard, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'

function servicio(overrides: Partial<CatalogoServicioParaWizard> & { id: string; nombre: string }): CatalogoServicioParaWizard {
  return {
    descripcion: '',
    edtNombre: 'GES',
    actividadTag: [],
    filtroAlcance: 'general',
    notaCantidad: null,
    horaBase: 4,
    horaRepetido: 0,
    cantidad: 1,
    nivelDificultad: 1,
    orden: 0,
    unidadNombre: 'unidad',
    recursoNombre: 'Ingeniero',
    ...overrides,
  }
}

function config(overrides: Partial<ConfiguracionWizardPaso1> = {}): ConfiguracionWizardPaso1 {
  return {
    edtsSeleccionados: [],
    brownfield: false,
    ingenieriaDetalle: false,
    tableros: [],
    plcs: [],
    hmiCantidad: 0,
    scada: false,
    nValorizaciones: 0,
    duracionSemanas: 0,
    nPersonas: 0,
    nPets: 0,
    alcanceLibre: '',
    ...overrides,
  }
}

describe('calcularHorasEstimadas', () => {
  it('HH = (horaBase + max(0,cantidad-1)*horaRepetido) * nivelDificultad', () => {
    expect(calcularHorasEstimadas(4, 1, 3, 1)).toBe((4 + 2 * 1) * 1)
    expect(calcularHorasEstimadas(4, 1, 3, 1.5)).toBe((4 + 2 * 1) * 1.5)
  })

  it('cantidad=1 no suma horaRepetido', () => {
    expect(calcularHorasEstimadas(4, 2, 1, 1)).toBe(4)
  })

  it('valores null se tratan como 0', () => {
    expect(calcularHorasEstimadas(null, null, 5, 1)).toBe(0)
  })
})

describe('evaluarAlcance', () => {
  it('general siempre incluida', () => {
    expect(evaluarAlcance('general', { brownfield: false, ingenieriaDetalle: false }).incluida).toBe(true)
  })

  it('brownfield solo incluida si el proyecto es brownfield', () => {
    expect(evaluarAlcance('brownfield', { brownfield: true, ingenieriaDetalle: false }).incluida).toBe(true)
    const excluida = evaluarAlcance('brownfield', { brownfield: false, ingenieriaDetalle: false })
    expect(excluida.incluida).toBe(false)
    expect(excluida.motivoExclusion).toBeTruthy()
  })

  it('detalle solo incluida si el contrato tiene ingeniería de detalle', () => {
    expect(evaluarAlcance('detalle', { brownfield: false, ingenieriaDetalle: true }).incluida).toBe(true)
    expect(evaluarAlcance('detalle', { brownfield: false, ingenieriaDetalle: false }).incluida).toBe(false)
  })
})

describe('generarActividadesDeterministas — GES (por tag fijo)', () => {
  const gesServicios = [
    servicio({ id: 'g1', nombre: 'Kickoff', actividadTag: ['Inicio'] }),
    servicio({ id: 'g2', nombre: 'Cronograma', actividadTag: ['Documentos'] }),
    servicio({ id: 'g3', nombre: 'Reporte Semanal', actividadTag: ['Seguimiento'] }),
    servicio({ id: 'g4', nombre: 'Levantamiento en Campo', actividadTag: ['Inicio'], filtroAlcance: 'brownfield' }),
  ]
  const edts: EdtParaGenerar[] = [{ nombre: 'GES', descripcion: 'Gestión', servicios: gesServicios }]

  it('crea las 3 actividades fijas con sus tareas agrupadas por tag', () => {
    const r = generarActividadesDeterministas(edts, config())
    const nombres = r.actividades.map(a => a.actividadNombre).sort()
    expect(nombres).toEqual(['Control y Seguimiento', 'Documentos de Gestión', 'Inicio'])
  })

  it('una tarea brownfield-only aparece pero marcada incluida=false si el proyecto no es brownfield', () => {
    const r = generarActividadesDeterministas(edts, config({ brownfield: false }))
    const inicio = r.actividades.find(a => a.actividadNombre === 'Inicio')!
    const campo = inicio.tareas.find(t => t.catalogoServicioId === 'g4')!
    expect(campo.incluida).toBe(false)
  })
})

describe('generarActividadesDeterministas — ING (crea solo actividades con >=1 tarea incluida)', () => {
  it('una disciplina cuyas tareas son todas detalle-only y ingenieriaDetalle=false no genera Actividad', () => {
    const servicios = [
      servicio({ id: 'i1', nombre: 'Memoria de Cálculo', actividadTag: ['Electrico'], filtroAlcance: 'detalle' }),
      servicio({ id: 'i2', nombre: 'Listado de Cables', actividadTag: ['Electrico'], filtroAlcance: 'general' }),
      servicio({ id: 'i3', nombre: 'Filosofía de Control', actividadTag: ['Control'], filtroAlcance: 'detalle' }),
    ]
    const edts: EdtParaGenerar[] = [{ nombre: 'ING', descripcion: 'Ingeniería', servicios }]

    const sinDetalle = generarActividadesDeterministas(edts, config({ ingenieriaDetalle: false }))
    expect(sinDetalle.actividades.map(a => a.actividadNombre)).toEqual(['Disciplina Eléctrica'])

    const conDetalle = generarActividadesDeterministas(edts, config({ ingenieriaDetalle: true }))
    expect(conDetalle.actividades.map(a => a.actividadNombre).sort()).toEqual(['Disciplina Control', 'Disciplina Eléctrica'])
  })

  it('servicios sin tag reconocido caen en "Otros"', () => {
    const servicios = [servicio({ id: 'i4', nombre: 'Diagramas P&ID', actividadTag: [] })]
    const edts: EdtParaGenerar[] = [{ nombre: 'ING', descripcion: 'Ingeniería', servicios }]
    const r = generarActividadesDeterministas(edts, config())
    expect(r.actividades.map(a => a.actividadNombre)).toEqual(['Otros'])
  })
})

describe('generarActividadesDeterministas — PLA (Tablero replicado por instancia)', () => {
  it('las tareas [Tablero] se replican una vez por cada nombre de tablero del Paso 1', () => {
    const servicios = [
      servicio({ id: 'p1', nombre: 'Planos Generales de Tablero', actividadTag: ['Tablero'] }),
      servicio({ id: 'p2', nombre: 'Diagramas de Lazos', actividadTag: ['Instrumentacion'] }),
    ]
    const edts: EdtParaGenerar[] = [{ nombre: 'PLA', descripcion: 'Planos', servicios }]
    const r = generarActividadesDeterministas(edts, config({ tableros: [{ nombre: 'TCO-CMN-QUI-007' }, { nombre: 'TCO-CMN-QUI-008' }] }))

    const nombresTableros = r.actividades.filter(a => a.actividadNombre.startsWith('Tablero ')).map(a => a.actividadNombre)
    expect(nombresTableros).toEqual(['Tablero TCO-CMN-QUI-007', 'Tablero TCO-CMN-QUI-008'])
    expect(r.actividades.find(a => a.actividadNombre === 'Tablero TCO-CMN-QUI-007')!.tareas[0].catalogoServicioId).toBe('p1')
    expect(r.actividades.find(a => a.actividadNombre === 'Disciplina Instrumentación')).toBeTruthy()
  })

  it('sin nombres de tablero en el Paso 1, NO genera ninguna Actividad de tablero (regla dura: N° tableros > 0) y agrega advertencia', () => {
    const servicios = [servicio({ id: 'p1', nombre: 'Planos Generales de Tablero', actividadTag: ['Tablero'] })]
    const edts: EdtParaGenerar[] = [{ nombre: 'PLA', descripcion: 'Planos', servicios }]
    const r = generarActividadesDeterministas(edts, config({ tableros: [] }))
    expect(r.actividades).toHaveLength(0)
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('un nombre de tablero que ya empieza con "Tablero" no duplica el prefijo', () => {
    const servicios = [servicio({ id: 'p1', nombre: 'Planos Generales de Tablero', actividadTag: ['Tablero'] })]
    const edts: EdtParaGenerar[] = [{ nombre: 'PLA', descripcion: 'Planos', servicios }]
    const r = generarActividadesDeterministas(edts, config({ tableros: [{ nombre: 'Tablero Principal' }] }))
    expect(r.actividades.map(a => a.actividadNombre)).toEqual(['Tablero Principal'])
  })
})

describe('generarActividadesDeterministas — TAB (una Actividad por instancia, catálogo completo replicado)', () => {
  it('TAB genera una Actividad "Tablero <nombre>" por cada tablero, con TODOS los servicios TAB', () => {
    const servicios = [servicio({ id: 'tab1', nombre: 'Cableado de Fuerza' }), servicio({ id: 'tab2', nombre: 'Pruebas FAT' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'TAB', descripcion: 'Armado de Tableros', servicios }]
    const r = generarActividadesDeterministas(edts, config({ tableros: [{ nombre: 'TCO-CMN-QUI-007' }] }))
    expect(r.actividades).toHaveLength(1)
    expect(r.actividades[0].actividadNombre).toBe('Tablero TCO-CMN-QUI-007')
    expect(r.actividades[0].tareas).toHaveLength(2)
  })

  it('TAB sin nombres de tablero en el Paso 1 NO genera ninguna Actividad (regla dura: N° tableros > 0)', () => {
    const servicios = [servicio({ id: 'tab1', nombre: 'Cableado de Fuerza' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'TAB', descripcion: 'Armado de Tableros', servicios }]
    const r = generarActividadesDeterministas(edts, config({ tableros: [] }))
    expect(r.actividades).toHaveLength(0)
    expect(r.advertencias.length).toBeGreaterThan(0)
  })
})

describe('generarActividadesDeterministas — CMM/SEG (una sola Actividad fija)', () => {
  it('CMM genera una única Actividad "Comisionamiento" con todo el catálogo', () => {
    const servicios = [servicio({ id: 'c1', nombre: 'Pruebas en Frío' }), servicio({ id: 'c2', nombre: 'Pruebas en Caliente' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'CMM', descripcion: 'Comisionamiento', servicios }]
    const r = generarActividadesDeterministas(edts, config())
    expect(r.actividades).toHaveLength(1)
    expect(r.actividades[0].actividadNombre).toBe('Comisionamiento')
    expect(r.actividades[0].tareas).toHaveLength(2)
  })

  it('SEG ignora actividadTag para agrupar — todo cae en "Documentos de Seguridad"', () => {
    const servicios = [
      servicio({ id: 's1', nombre: 'IPERC', actividadTag: ['General'] }),
      servicio({ id: 's2', nombre: 'Habilitación HSE', actividadTag: ['Brownfield'], filtroAlcance: 'brownfield' }),
    ]
    const edts: EdtParaGenerar[] = [{ nombre: 'SEG', descripcion: 'Seguridad', servicios }]
    const r = generarActividadesDeterministas(edts, config({ brownfield: true }))
    expect(r.actividades).toHaveLength(1)
    expect(r.actividades[0].actividadNombre).toBe('Documentos de Seguridad')
    expect(r.actividades[0].tareas).toHaveLength(2)
  })
})

describe('generarActividadesDeterministas — CON/PRO/PLC/HMI nunca pasan por el motor determinista', () => {
  it('EDTs CON, PRO, PLC y HMI se ignoran completamente (se gestionan en Bloque D con IA)', () => {
    const edts: EdtParaGenerar[] = [
      { nombre: 'CON', descripcion: 'Construcción', servicios: [servicio({ id: 'x1', nombre: 'Tendido de cables' })] },
      { nombre: 'PRO', descripcion: 'Procura', servicios: [servicio({ id: 'x2', nombre: 'Solicitud de Cotización' })] },
      { nombre: 'PLC', descripcion: 'PLC', servicios: [servicio({ id: 'x3', nombre: 'Lógica de Motor' })] },
      { nombre: 'HMI', descripcion: 'HMI', servicios: [servicio({ id: 'x4', nombre: 'Pantalla de Proceso' })] },
    ]
    const r = generarActividadesDeterministas(edts, config())
    expect(r.actividades).toHaveLength(0)
  })
})

describe('generarActividadesDeterministas — fallback genérico (ej. CAD, EDTs sin regla propia)', () => {
  it('un EDT sin regla especial genera una única Actividad con todo su catálogo', () => {
    const servicios = [servicio({ id: 'cad1', nombre: 'Diagrama Unifilar' }), servicio({ id: 'cad2', nombre: 'Planos de Distribución Eléctrica' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'CAD', descripcion: 'Diagramas y Planos', servicios }]
    const r = generarActividadesDeterministas(edts, config())
    expect(r.actividades).toHaveLength(1)
    expect(r.actividades[0].actividadNombre).toBe('Diagramas y Planos')
    expect(r.actividades[0].tareas).toHaveLength(2)
  })
})

describe('generarActividadesDeterministas — orden de tareas siempre por el campo orden del catálogo', () => {
  it('reordena las tareas por orden real, sin importar el orden de llegada del fetch', () => {
    const servicios = [
      servicio({ id: 't-embalaje', nombre: 'Embalaje y Preparación para Despacho', orden: 12 }),
      servicio({ id: 't-fat', nombre: 'Pruebas FAT', orden: 11 }),
      servicio({ id: 't-recepcion', nombre: 'Recepción y Verificación de Materiales', orden: 0 }),
      servicio({ id: 't-cableado', nombre: 'Cableado de Control (PLC-I/O)', orden: 5 }),
    ]
    const edts: EdtParaGenerar[] = [{ nombre: 'TAB', descripcion: 'Armado de Tableros', servicios }]
    const r = generarActividadesDeterministas(edts, config({ tableros: [{ nombre: 'TCO-001' }] }))
    expect(r.actividades[0].tareas.map(t => t.catalogoServicioId)).toEqual(['t-recepcion', 't-cableado', 't-fat', 't-embalaje'])
  })

  it('servicios con el mismo orden (o sin orden) no rompen el sort — orden estable', () => {
    const servicios = [servicio({ id: 's1', nombre: 'A' }), servicio({ id: 's2', nombre: 'B' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'CMM', descripcion: 'Comisionamiento', servicios }]
    const r = generarActividadesDeterministas(edts, config())
    expect(r.actividades[0].tareas.map(t => t.catalogoServicioId)).toEqual(['s1', 's2'])
  })
})

describe('calcularEdtsPendientesIA', () => {
  const SELECCIONADOS = [
    { id: 'e-ges', nombre: 'GES' },
    { id: 'e-con', nombre: 'CON' },
    { id: 'e-pro', nombre: 'PRO' },
    { id: 'e-plc', nombre: 'PLC' },
  ]

  it('borrador recién creado (sin actividades todavía): todos los EDTs de agrupación IA quedan pendientes', () => {
    const r = calcularEdtsPendientesIA(SELECCIONADOS, [])
    expect(r.map(e => e.nombre).sort()).toEqual(['CON', 'PLC', 'PRO'])
  })

  it('EDTs con Actividades ya propuestas no cuentan como pendientes (restaurar un borrador con IA ya generada)', () => {
    const r = calcularEdtsPendientesIA(SELECCIONADOS, [
      { edtNombre: 'CON' },
      { edtNombre: 'PRO' },
    ])
    expect(r.map(e => e.nombre)).toEqual(['PLC'])
  })

  it('EDTs deterministas (GES) nunca cuentan como pendientes de IA', () => {
    const r = calcularEdtsPendientesIA(SELECCIONADOS, [])
    expect(r.find(e => e.nombre === 'GES')).toBeUndefined()
  })

  it('todos los EDTs de agrupación IA ya resueltos: no queda ninguno pendiente', () => {
    const r = calcularEdtsPendientesIA(SELECCIONADOS, [{ edtNombre: 'CON' }, { edtNombre: 'PRO' }, { edtNombre: 'PLC' }])
    expect(r).toHaveLength(0)
  })
})
