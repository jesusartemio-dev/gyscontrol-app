import {
  calcularHorasEstimadas,
  evaluarAlcance,
  generarActividadesDeterministas,
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

    const nombresTableros = r.actividades.filter(a => a.actividadNombre.startsWith('TCO')).map(a => a.actividadNombre)
    expect(nombresTableros).toEqual(['TCO-CMN-QUI-007', 'TCO-CMN-QUI-008'])
    expect(r.actividades.find(a => a.actividadNombre === 'TCO-CMN-QUI-007')!.tareas[0].catalogoServicioId).toBe('p1')
    expect(r.actividades.find(a => a.actividadNombre === 'Disciplina Instrumentación')).toBeTruthy()
  })

  it('sin nombres de tablero en el Paso 1, usa "Tablero 1" y agrega advertencia', () => {
    const servicios = [servicio({ id: 'p1', nombre: 'Planos Generales de Tablero', actividadTag: ['Tablero'] })]
    const edts: EdtParaGenerar[] = [{ nombre: 'PLA', descripcion: 'Planos', servicios }]
    const r = generarActividadesDeterministas(edts, config({ tableros: [] }))
    expect(r.actividades.map(a => a.actividadNombre)).toEqual(['Tablero 1'])
    expect(r.advertencias.length).toBeGreaterThan(0)
  })
})

describe('generarActividadesDeterministas — PLC/TAB (una Actividad por instancia, catálogo completo replicado)', () => {
  it('PLC genera una Actividad por cada nombre de PLC con TODOS los servicios PLC', () => {
    const servicios = [servicio({ id: 'plc1', nombre: 'Lógica de Motor' }), servicio({ id: 'plc2', nombre: 'Lógica de Alarmas' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'PLC', descripcion: 'PLC', servicios }]
    const r = generarActividadesDeterministas(edts, config({ plcs: [{ nombre: 'PLC Balanza 220' }] }))
    expect(r.actividades).toHaveLength(1)
    expect(r.actividades[0].actividadNombre).toBe('PLC Balanza 220')
    expect(r.actividades[0].tareas).toHaveLength(2)
  })
})

describe('generarActividadesDeterministas — HMI (estaciones + SCADA separado por nombre)', () => {
  it('sin scada, todo el catálogo va a cada estación', () => {
    const servicios = [servicio({ id: 'h1', nombre: 'Pantalla de Proceso' }), servicio({ id: 'h2', nombre: 'Configuración de Tags SCADA' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'HMI', descripcion: 'HMI', servicios }]
    const r = generarActividadesDeterministas(edts, config({ hmiCantidad: 2, scada: false }))
    expect(r.actividades.map(a => a.actividadNombre)).toEqual(['Estación HMI 1', 'Estación HMI 2'])
    expect(r.actividades[0].tareas).toHaveLength(2)
  })

  it('con scada, las tareas con "SCADA" en el nombre van a una Actividad SCADA separada', () => {
    const servicios = [servicio({ id: 'h1', nombre: 'Pantalla de Proceso' }), servicio({ id: 'h2', nombre: 'Configuración de Tags SCADA' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'HMI', descripcion: 'HMI', servicios }]
    const r = generarActividadesDeterministas(edts, config({ hmiCantidad: 1, scada: true }))
    const nombres = r.actividades.map(a => a.actividadNombre)
    expect(nombres).toContain('SCADA')
    expect(r.actividades.find(a => a.actividadNombre === 'SCADA')!.tareas.map(t => t.catalogoServicioId)).toEqual(['h2'])
    expect(r.actividades.find(a => a.actividadNombre === 'Estación HMI 1')!.tareas.map(t => t.catalogoServicioId)).toEqual(['h1'])
  })

  it('hmiCantidad=0 no genera ninguna actividad aunque haya servicios', () => {
    const servicios = [servicio({ id: 'h1', nombre: 'Pantalla de Proceso' })]
    const edts: EdtParaGenerar[] = [{ nombre: 'HMI', descripcion: 'HMI', servicios }]
    const r = generarActividadesDeterministas(edts, config({ hmiCantidad: 0 }))
    expect(r.actividades).toHaveLength(0)
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

describe('generarActividadesDeterministas — CON/PRO nunca pasan por el motor determinista', () => {
  it('EDTs CON y PRO se ignoran completamente (se gestionan en Bloque D con IA)', () => {
    const edts: EdtParaGenerar[] = [
      { nombre: 'CON', descripcion: 'Construcción', servicios: [servicio({ id: 'x1', nombre: 'Tendido de cables' })] },
      { nombre: 'PRO', descripcion: 'Procura', servicios: [servicio({ id: 'x2', nombre: 'Solicitud de Cotización' })] },
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
