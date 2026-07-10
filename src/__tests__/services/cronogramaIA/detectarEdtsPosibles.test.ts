import { detectarEdtsPosibles, type EvidenciaTexto } from '@/lib/cronogramaIA/detectarEdtsPosibles'

describe('detectarEdtsPosibles', () => {
  it('caso G300 real: partida "DESARROLLO DE PLANOS" tageada como ING sugiere PLA con motivo citando la partida', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'DESARROLLO DE PLANOS', origen: 'Partida "DESARROLLO DE PLANOS"', edtActual: 'ING' }]
    const r = detectarEdtsPosibles(evidencias)
    expect(r).toHaveLength(1)
    expect(r[0].edtNombre).toBe('PLA')
    expect(r[0].motivo).toContain('DESARROLLO DE PLANOS')
    expect(r[0].motivo).toContain('ING')
    expect(r[0].motivo).toContain('PLA')
  })

  it('una partida ya tageada correctamente como PLA no genera sugerencia (no hay mismatch)', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'Elaboración de planos unifilares', origen: 'Partida "Planos"', edtActual: 'PLA' }]
    expect(detectarEdtsPosibles(evidencias)).toHaveLength(0)
  })

  it('detecta PLC por "programación PLC" en una partida genérica', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'Programación PLC y pruebas de lógica', origen: 'Partida "Automatización"', edtActual: 'ING' }]
    const r = detectarEdtsPosibles(evidencias)
    expect(r.map(e => e.edtNombre)).toContain('PLC')
  })

  it('detecta HMI por menciones de SCADA/pantallas', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'Configuración de pantallas HMI y enlace a SCADA existente', origen: 'Partida "Control"', edtActual: 'ING' }]
    const r = detectarEdtsPosibles(evidencias)
    expect(r.map(e => e.edtNombre)).toContain('HMI')
  })

  it('detecta TAB por "fabricación/armado de tablero" (taller)', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'Armado de tablero de control en taller', origen: 'Partida "Taller"', edtActual: 'CON' }]
    const r = detectarEdtsPosibles(evidencias)
    expect(r.map(e => e.edtNombre)).toContain('TAB')
  })

  it('"montaje de tablero" NO dispara TAB — es instalación en campo (CON), no fabricación de taller', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'MONTAJE DE TABLEROS', origen: 'Partida "MONTAJE DE TABLEROS"', edtActual: 'CON' }]
    expect(detectarEdtsPosibles(evidencias)).toHaveLength(0)
  })

  it('texto libre (sin edtActual) también dispara la sugerencia — ej. descripción libre del alcance', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'El proyecto incluye desarrollo de planos y diagramas', origen: 'Descripción libre del alcance' }]
    const r = detectarEdtsPosibles(evidencias)
    expect(r).toHaveLength(1)
    expect(r[0].edtNombre).toBe('PLA')
    expect(r[0].motivo).toContain('Descripción libre del alcance')
  })

  it('sin ninguna evidencia que matchee, no sugiere nada', () => {
    const evidencias: EvidenciaTexto[] = [{ texto: 'Gestión documentaria y kick-off', origen: 'Partida "Gestión"', edtActual: 'GES' }]
    expect(detectarEdtsPosibles(evidencias)).toHaveLength(0)
  })

  it('no duplica sugerencias para el mismo EDT aunque varias evidencias lo mencionen', () => {
    const evidencias: EvidenciaTexto[] = [
      { texto: 'Desarrollo de planos', origen: 'Partida A', edtActual: 'ING' },
      { texto: 'Elaboración de unifilares', origen: 'Partida B', edtActual: 'ING' },
    ]
    const r = detectarEdtsPosibles(evidencias)
    expect(r.filter(e => e.edtNombre === 'PLA')).toHaveLength(1)
  })

  it('lista de evidencias vacía no revienta y no sugiere nada', () => {
    expect(detectarEdtsPosibles([])).toHaveLength(0)
  })

  it('evidencia con texto vacío se ignora sin romper', () => {
    expect(detectarEdtsPosibles([{ texto: '', origen: 'Partida vacía', edtActual: 'ING' }])).toHaveLength(0)
  })

  it('caso G300 real completo: el nombre de la partida "DESARROLLO DE PLANOS" (alta) gana sobre una mención de paso en la descripción de otra partida de Cierre (baja)', () => {
    const evidencias: EvidenciaTexto[] = [
      {
        texto: 'Revisión y actualización de planos y documentos conforme a la ejecución.',
        origen: 'Partida "Actualización de Documentación Final (As Built)"',
        edtActual: 'CIE',
        prioridad: 'baja',
      },
      { texto: 'DESARROLLO DE PLANOS', origen: 'Partida "DESARROLLO DE PLANOS"', edtActual: 'ING', prioridad: 'alta' },
    ]
    const r = detectarEdtsPosibles(evidencias)
    const pla = r.find(e => e.edtNombre === 'PLA')!
    expect(pla.motivo).toContain('DESARROLLO DE PLANOS')
    expect(pla.motivo).not.toContain('As Built')
  })

  it('sin evidencia de alta prioridad, usa la de baja prioridad disponible (nunca se queda sin sugerir)', () => {
    const evidencias: EvidenciaTexto[] = [
      { texto: 'Incluye revisión de planos existentes', origen: 'Descripción libre del alcance', prioridad: 'baja' },
    ]
    const r = detectarEdtsPosibles(evidencias)
    expect(r.find(e => e.edtNombre === 'PLA')).toBeTruthy()
  })

  it('sin prioridad especificada, se trata como baja (nunca gana a una evidencia de alta prioridad explícita)', () => {
    const evidencias: EvidenciaTexto[] = [
      { texto: 'menciona planos de paso', origen: 'Partida B', edtActual: 'ING' },
      { texto: 'DESARROLLO DE PLANOS', origen: 'Partida "DESARROLLO DE PLANOS"', edtActual: 'ING', prioridad: 'alta' },
    ]
    const r = detectarEdtsPosibles(evidencias)
    expect(r.find(e => e.edtNombre === 'PLA')!.motivo).toContain('DESARROLLO DE PLANOS')
  })
})
