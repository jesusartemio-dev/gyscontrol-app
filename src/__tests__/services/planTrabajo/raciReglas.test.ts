import { calcularRolRaci, clasificarEdtRaci, esEdtDeDocumentacion, esEdtDeSeguridad } from '@/lib/planTrabajo/raciReglas'

function ctx(overrides: Partial<Parameters<typeof calcularRolRaci>[0]> = {}) {
  return {
    cargoLabel: '',
    tipoEdt: 'gestion' as 'gestion' | 'campo',
    esEdtDeSeguridad: false,
    esEdtDeDocumentacion: false,
    ...overrides,
  }
}

describe('esEdtDeDocumentacion', () => {
  it('reconoce EDTs de planos/dibujo/documentación', () => {
    expect(esEdtDeDocumentacion('Elaboración de Planos')).toBe(true)
    expect(esEdtDeDocumentacion('Dibujo de detalles constructivos')).toBe(true)
    expect(esEdtDeDocumentacion('Documentación final')).toBe(true)
  })

  it('no matchea EDTs sin relación a documentación', () => {
    expect(esEdtDeDocumentacion('Construcción')).toBe(false)
    expect(esEdtDeDocumentacion('Procura')).toBe(false)
  })
})

describe('calcularRolRaci — Cadista', () => {
  it('"CADISTA" ya no cae al default sin regla (no null)', () => {
    const rol = calcularRolRaci(ctx({ cargoLabel: 'CADISTA', esEdtDeDocumentacion: true }))
    expect(rol).not.toBeNull()
  })

  it('Cadista es R en un EDT de planos/dibujo/documentación', () => {
    expect(calcularRolRaci(ctx({ cargoLabel: 'CADISTA', esEdtDeDocumentacion: true }))).toBe('R')
    expect(calcularRolRaci(ctx({ cargoLabel: 'Dibujante Senior', esEdtDeDocumentacion: true }))).toBe('R')
  })

  it('Cadista no participa (celda vacía) en el resto de EDTs', () => {
    expect(calcularRolRaci(ctx({ cargoLabel: 'CADISTA', esEdtDeDocumentacion: false }))).toBe('')
  })
})

describe('calcularRolRaci — celdas vacías y nuevos cargos', () => {
  it('técnicos y supervisor: R en campo, vacío en gestión', () => {
    expect(calcularRolRaci(ctx({ cargoLabel: 'TECNICO OPERARIO', tipoEdt: 'campo' }))).toBe('R')
    expect(calcularRolRaci(ctx({ cargoLabel: 'TECNICO OPERARIO' }))).toBe('')
    expect(calcularRolRaci(ctx({ cargoLabel: 'SUPERVISOR' }))).toBe('')
  })

  it('Logística es C en Suministro/Servicios y vacío en el resto', () => {
    expect(calcularRolRaci(ctx({ cargoLabel: 'LOGISTICA', esEdtDeLogistica: true }))).toBe('C')
    expect(calcularRolRaci(ctx({ cargoLabel: 'LOGISTICA' }))).toBe('')
  })

  it('Comercial solo se informa en arranque y cierre', () => {
    expect(calcularRolRaci(ctx({ cargoLabel: 'COMERCIAL', esEdtDeArranqueOCierre: true }))).toBe('I')
    expect(calcularRolRaci(ctx({ cargoLabel: 'COMERCIAL' }))).toBe('')
  })

  it('SSOMA: R en Seguridad, C en campo, vacío en gestión', () => {
    expect(calcularRolRaci(ctx({ cargoLabel: 'SSOMA', esEdtDeSeguridad: true }))).toBe('R')
    expect(calcularRolRaci(ctx({ cargoLabel: 'SSOMA', tipoEdt: 'campo' }))).toBe('C')
    expect(calcularRolRaci(ctx({ cargoLabel: 'SSOMA' }))).toBe('')
  })
})

describe('clasificarEdtRaci', () => {
  it('usa el código del catálogo cuando viene', () => {
    expect(clasificarEdtRaci('Comisionamiento', 'CMM').tipoEdt).toBe('campo')
    expect(clasificarEdtRaci('Planos de Ingeniería', 'PLA').esEdtDeDocumentacion).toBe(true)
    expect(clasificarEdtRaci('Servicios y Alquileres', 'SER').esEdtDeLogistica).toBe(true)
    expect(clasificarEdtRaci('Seguimiento de Seguridad', 'SSO').esEdtDeSeguridad).toBe(true)
  })
})
