import {
  parsearActividadTags,
  parsearEstructuraCatalogoServicio,
} from '@/lib/cronogramaIA/parseCatalogoServicioEstructura'

describe('parsearActividadTags', () => {
  it('extrae un solo tag inicial', () => {
    expect(parsearActividadTags('[Inicio] Reunión formal de arranque.')).toEqual(['Inicio'])
  })

  it('extrae múltiples tags consecutivos al inicio', () => {
    expect(parsearActividadTags('[Tablero][Electrico] Diseño de tablero de control.')).toEqual(['Tablero', 'Electrico'])
  })

  it('descripción sin tags devuelve array vacío', () => {
    expect(parsearActividadTags('Diagramas de proceso e instrumentación (P&ID)')).toEqual([])
  })

  it('un corchete que no está al inicio no cuenta como tag', () => {
    expect(parsearActividadTags('Revisión de planos (ver anexo [A])')).toEqual([])
  })
})

describe('parsearEstructuraCatalogoServicio — filtroAlcance', () => {
  it('tag [Brownfield] → brownfield, sin advertencia', () => {
    const r = parsearEstructuraCatalogoServicio('[Brownfield] Tendido de cables en bandejas existentes.')
    expect(r.filtroAlcance).toBe('brownfield')
    expect(r.advertencia).toBeNull()
  })

  it('frase "Alcance: proyectos en instalaciones existentes" sin tag → brownfield', () => {
    const r = parsearEstructuraCatalogoServicio('Trabajo en planta operativa. Alcance: proyectos en instalaciones existentes.')
    expect(r.filtroAlcance).toBe('brownfield')
  })

  it('frase "Alcance: solo en contratos con ingeniería de detalle" → detalle', () => {
    const r = parsearEstructuraCatalogoServicio('Memoria de cálculo eléctrico. Alcance: solo en contratos con ingeniería de detalle.')
    expect(r.filtroAlcance).toBe('detalle')
  })

  it('descripción sin "Alcance:" → general, sin advertencia', () => {
    const r = parsearEstructuraCatalogoServicio('Configuración de I/O tree del PLC.')
    expect(r.filtroAlcance).toBe('general')
    expect(r.advertencia).toBeNull()
  })

  it('"Alcance:" presente pero frase no reconocida → general CON advertencia (revisión manual)', () => {
    const r = parsearEstructuraCatalogoServicio('Alcance: a definir con el cliente en campo.')
    expect(r.filtroAlcance).toBe('general')
    expect(r.advertencia).toContain('Alcance')
  })
})

describe('parsearEstructuraCatalogoServicio — notaCantidad', () => {
  it('"Cantidad = N° de PETS" → notaCantidad="PETS"', () => {
    const r = parsearEstructuraCatalogoServicio('Elaboración de PETS. Cantidad = N° de PETS.')
    expect(r.notaCantidad).toBe('PETS')
  })

  it('"Cantidad = Nº de tableros" (con Nº en vez de N°) → notaCantidad="tableros"', () => {
    const r = parsearEstructuraCatalogoServicio('Cantidad = Nº de tableros.')
    expect(r.notaCantidad).toBe('tableros')
  })

  it('sin mención de "Cantidad" → null, sin advertencia', () => {
    const r = parsearEstructuraCatalogoServicio('Pruebas de energización y control.')
    expect(r.notaCantidad).toBeNull()
    expect(r.advertencia).toBeNull()
  })

  it('"Cantidad" presente pero no matchea el patrón → null CON advertencia', () => {
    const r = parsearEstructuraCatalogoServicio('La Cantidad depende del avance de obra.')
    expect(r.notaCantidad).toBeNull()
    expect(r.advertencia).toContain('Cantidad')
  })
})

describe('parsearEstructuraCatalogoServicio — reglasDificultad nunca se auto-puebla', () => {
  it('el resultado no incluye la clave reglasDificultad', () => {
    const r = parsearEstructuraCatalogoServicio('[Tablero] Montaje de tablero MCC grande.')
    expect('reglasDificultad' in r).toBe(false)
  })
})

describe('parsearEstructuraCatalogoServicio — idempotencia', () => {
  it('parsear la misma descripción dos veces produce el mismo resultado', () => {
    const descripcion = '[Tablero][Electrico] Diseño de tablero. Cantidad = N° de tableros. Alcance: proyectos en instalaciones existentes.'
    const r1 = parsearEstructuraCatalogoServicio(descripcion)
    const r2 = parsearEstructuraCatalogoServicio(descripcion)
    expect(r2).toEqual(r1)
  })
})
