import { corregirFueraDeVocabulario } from '@/lib/cronogramaIA/generarEsquemasConIA'
import { FAMILIAS_OFICIALES_PRO, NOMBRE_FAMILIA_OFICIAL_PRO, textoVocabularioFamiliasPro } from '@/lib/cronogramaIA/vocabularioFamiliasPro'

describe('vocabularioFamiliasPro — vocabulario oficial en código, no solo en el prompt', () => {
  it('las 16 familias oficiales están presentes', () => {
    expect(FAMILIAS_OFICIALES_PRO).toHaveLength(16)
    expect(NOMBRE_FAMILIA_OFICIAL_PRO.has('Cables')).toBe(true)
    expect(NOMBRE_FAMILIA_OFICIAL_PRO.has('Soportes Fabricados')).toBe(true)
    expect(NOMBRE_FAMILIA_OFICIAL_PRO.has('Calibración Certificada')).toBe(true)
  })

  it('textoVocabularioFamiliasPro incluye el vocabulario embebido en el prompt', () => {
    const texto = textoVocabularioFamiliasPro()
    expect(texto).toContain('Cables')
    expect(texto).toContain('MATERIALES')
    expect(texto).toContain('ALQUILERES')
    expect(texto).toContain('SUBCONTRATOS')
  })
})

describe('corregirFueraDeVocabulario — nunca se confía el flag del LLM en ninguna dirección', () => {
  it('CON nunca se marca fuera de vocabulario (no tiene vocabulario oficial)', () => {
    expect(corregirFueraDeVocabulario('CON', 'Cualquier Zona Inventada', true, 'justificación')).toEqual({})
  })

  it('familia oficial marcada erróneamente como fuera de vocabulario por la IA — se corrige a no marcada', () => {
    const r = corregirFueraDeVocabulario('PRO', 'Cables', true, 'la IA se equivocó')
    expect(r).toEqual({})
  })

  it('familia NO oficial sin flag (la IA lo omitió) — se corrige a fueraDeVocabulario true con justificación genérica', () => {
    const r = corregirFueraDeVocabulario('PRO', 'Soportería Especial de Bandejas', undefined, undefined)
    expect(r.fueraDeVocabulario).toBe(true)
    expect(r.justificacion).toBe('Propuesta por IA sin justificación explícita — revisar antes de aceptar.')
  })

  it('familia NO oficial con flag y justificación correctos — se preserva la justificación dada', () => {
    const r = corregirFueraDeVocabulario('PRO', 'Soportería Especial de Bandejas', true, 'el equipo XYZ no calza en ninguna familia oficial')
    expect(r).toEqual({ fueraDeVocabulario: true, justificacion: 'el equipo XYZ no calza en ninguna familia oficial' })
  })

  it('familia oficial sin flag (caso normal) — no se le agrega nada', () => {
    expect(corregirFueraDeVocabulario('PRO', 'Instrumentos', undefined, undefined)).toEqual({})
  })
})
