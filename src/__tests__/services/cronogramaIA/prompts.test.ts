import { SYSTEM_ESQUEMAS_ZONAS_CON, buildUserEsquemasZonasCon, buildUserEsquemasFamiliasPro } from '@/lib/cronogramaIA/prompts'

describe('SYSTEM_ESQUEMAS_ZONAS_CON — ejes fijos del esquema de agrupación de CON', () => {
  it('exige los 3 ejes fijos en orden, sin dejarlos a criterio del modelo', () => {
    const idxZona = SYSTEM_ESQUEMAS_ZONAS_CON.indexOf('Por zona / área física')
    const idxSistema = SYSTEM_ESQUEMAS_ZONAS_CON.indexOf('Por sistema / disciplina técnica')
    const idxEtapa = SYSTEM_ESQUEMAS_ZONAS_CON.indexOf('Por etapa / frente constructivo')

    expect(idxZona).toBeGreaterThan(-1)
    expect(idxSistema).toBeGreaterThan(-1)
    expect(idxEtapa).toBeGreaterThan(-1)
    expect(idxZona).toBeLessThan(idxSistema)
    expect(idxSistema).toBeLessThan(idxEtapa)
  })

  it('nunca deja omitir el esquema de zona, incluso sin contexto geográfico (regla de fallback con nota)', () => {
    expect(SYSTEM_ESQUEMAS_ZONAS_CON).toContain('NUNCA lo omitas')
    expect(SYSTEM_ESQUEMAS_ZONAS_CON).toContain('NO omitas')
    expect(SYSTEM_ESQUEMAS_ZONAS_CON).toContain('Zona 1 — renombrar')
    expect(SYSTEM_ESQUEMAS_ZONAS_CON).toContain('Nombra las zonas reales de tu proyecto')
  })
})

describe('buildUserEsquemasZonasCon — contexto para nombrar zonas', () => {
  it('incluye los equipos reales cotizados como señal para nombrar zonas (no solo familias de PRO)', () => {
    const prompt = buildUserEsquemasZonasCon('Instalación eléctrica en sala de tanques', null, [
      { codigo: 'TAB-01', descripcion: 'Tablero MCC 70-81', marca: 'Siemens', cantidad: 1, unidad: 'und', categoria: 'Tableros' },
    ])
    expect(prompt).toContain('EQUIPOS REALES YA COTIZADOS')
    expect(prompt).toContain('Tablero MCC 70-81')
  })

  it('sin equipos reales ni alcance, igual arma un prompt válido con placeholder explícito', () => {
    const prompt = buildUserEsquemasZonasCon('', null, null)
    expect(prompt).toContain('(no se proporcionó)')
    expect(prompt).not.toContain('EQUIPOS REALES YA COTIZADOS')
  })
})

describe('Contexto del TDR — señal débil, claramente etiquetada, en la Etapa A de CON y PRO', () => {
  const tdr = {
    resumen: 'El cliente solicita automatización completa de la planta de tratamiento.',
    puntos: ['Incluye SCADA redundante'],
    equiposIdentificados: ['Tablero MCC principal'],
    serviciosIdentificados: ['Programación PLC'],
  }

  it('buildUserEsquemasZonasCon incluye el TDR etiquetado con la advertencia de alcance no vendido', () => {
    const prompt = buildUserEsquemasZonasCon('Instalación eléctrica', null, null, tdr)
    expect(prompt).toContain('CONTEXTO DEL TDR')
    expect(prompt).toContain('pudo REDUCIRSE en la negociación comercial')
    expect(prompt).toContain('El cliente solicita automatización completa de la planta de tratamiento.')
    expect(prompt).toContain('Tablero MCC principal')
  })

  it('buildUserEsquemasFamiliasPro incluye el TDR etiquetado con la misma advertencia', () => {
    const prompt = buildUserEsquemasFamiliasPro('Procura de materiales', null, null, tdr)
    expect(prompt).toContain('CONTEXTO DEL TDR')
    expect(prompt).toContain('pudo REDUCIRSE en la negociación comercial')
    expect(prompt).toContain('Programación PLC')
  })

  it('sin TDR (parámetro omitido), no aparece ningún bloque de TDR en el prompt', () => {
    const prompt = buildUserEsquemasZonasCon('Instalación eléctrica', null, null)
    expect(prompt).not.toContain('CONTEXTO DEL TDR')
  })
})
