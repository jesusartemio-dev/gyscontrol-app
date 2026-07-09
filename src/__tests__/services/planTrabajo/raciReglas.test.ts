import { calcularRolRaci, esEdtDeDocumentacion, esEdtDeSeguridad } from '@/lib/planTrabajo/raciReglas'

function ctx(overrides: Partial<Parameters<typeof calcularRolRaci>[0]> = {}) {
  return {
    cargoLabel: '',
    tipoEdt: 'gestion' as const,
    esResponsableDelEdt: false,
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

  it('Cadista es I en el resto de EDTs', () => {
    expect(calcularRolRaci(ctx({ cargoLabel: 'CADISTA', esEdtDeDocumentacion: false }))).toBe('I')
  })
})
