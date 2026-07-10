import { derivarEdtsSoporte, evaluarSubalcanceCMM, aplicarSubalcanceCMM } from '@/lib/cronogramaIA/derivarEdtsSoporte'
import type { TareaPropuesta } from '@/types/cronogramaIA'

const CATALOGO = [
  { id: 'e-ges', nombre: 'GES' },
  { id: 'e-ing', nombre: 'ING' },
  { id: 'e-pla', nombre: 'PLA' },
  { id: 'e-plc', nombre: 'PLC' },
  { id: 'e-hmi', nombre: 'HMI' },
  { id: 'e-tab', nombre: 'TAB' },
  { id: 'e-con', nombre: 'CON' },
  { id: 'e-pro', nombre: 'PRO' },
  { id: 'e-seg', nombre: 'SEG' },
  { id: 'e-cmm', nombre: 'CMM' },
  { id: 'e-cie', nombre: 'CIE' },
]

function nombres(r: ReturnType<typeof derivarEdtsSoporte>) {
  return r.map(e => e.nombre).sort()
}

describe('derivarEdtsSoporte', () => {
  it('GES y CIE siempre se agregan aunque la cotización no los tenga', () => {
    const r = derivarEdtsSoporte(['e-ing'], CATALOGO)
    expect(nombres(r)).toEqual(['GES', 'CIE', 'ING'].sort())
    expect(r.find(e => e.nombre === 'GES')!.origen).toBe('regla-siempre')
    expect(r.find(e => e.nombre === 'CIE')!.origen).toBe('regla-siempre')
  })

  it('no duplica un EDT que ya viene de la cotización (origen se mantiene "cotizacion")', () => {
    const r = derivarEdtsSoporte(['e-ges', 'e-cie'], CATALOGO)
    expect(r.filter(e => e.nombre === 'GES')).toHaveLength(1)
    expect(r.find(e => e.nombre === 'GES')!.origen).toBe('cotizacion')
  })

  it('CON dispara SEG y PRO derivados, con motivo', () => {
    const r = derivarEdtsSoporte(['e-con'], CATALOGO)
    const seg = r.find(e => e.nombre === 'SEG')!
    const pro = r.find(e => e.nombre === 'PRO')!
    expect(seg.origen).toBe('regla-derivada')
    expect(seg.motivo).toContain('CON')
    expect(pro.origen).toBe('regla-derivada')
    expect(pro.motivo).toContain('CON')
  })

  it('TAB también dispara SEG y PRO (trabajo de taller)', () => {
    const r = derivarEdtsSoporte(['e-tab'], CATALOGO)
    expect(nombres(r)).toEqual(expect.arrayContaining(['SEG', 'PRO', 'TAB']))
  })

  it('sin CON/TAB/CMM, no se agrega SEG ni PRO', () => {
    const r = derivarEdtsSoporte(['e-ing'], CATALOGO)
    expect(r.find(e => e.nombre === 'SEG')).toBeUndefined()
    expect(r.find(e => e.nombre === 'PRO')).toBeUndefined()
  })

  it('PLC o HMI presentes sugieren CMM (origen regla-sugerencia), no lo fuerzan como cotizado', () => {
    const r = derivarEdtsSoporte(['e-plc'], CATALOGO)
    const cmm = r.find(e => e.nombre === 'CMM')!
    expect(cmm.origen).toBe('regla-sugerencia')
    expect(cmm.motivo).toContain('PLC')
  })

  it('si CMM ya viene de la cotización, no se sobreescribe con la sugerencia', () => {
    const r = derivarEdtsSoporte(['e-cmm', 'e-plc'], CATALOGO)
    const cmm = r.find(e => e.nombre === 'CMM')!
    expect(cmm.origen).toBe('cotizacion')
    expect(r.filter(e => e.nombre === 'CMM')).toHaveLength(1)
  })

  it('CON solo (sin TAB/PLC/HMI) también sugiere CMM — caso G300: montaje eléctrico termina en energización/pruebas aunque no haya tableros ni control programable', () => {
    const r = derivarEdtsSoporte(['e-con'], CATALOGO)
    const cmm = r.find(e => e.nombre === 'CMM')!
    expect(cmm.origen).toBe('regla-sugerencia')
    expect(cmm.motivo).toContain('CON')
  })

  it('sin CON/TAB/PLC/HMI (solo ING), no se sugiere CMM', () => {
    const r = derivarEdtsSoporte(['e-ing'], CATALOGO)
    expect(r.find(e => e.nombre === 'CMM')).toBeUndefined()
  })

  it('lista base vacía igual agrega GES/CIE por regla-siempre', () => {
    const r = derivarEdtsSoporte([], CATALOGO)
    expect(nombres(r)).toEqual(['CIE', 'GES'])
  })

  it('un EDT derivado que no existe en el catálogo real no revienta (se omite)', () => {
    const catalogoIncompleto = CATALOGO.filter(e => e.nombre !== 'SEG')
    const r = derivarEdtsSoporte(['e-con'], catalogoIncompleto)
    expect(r.find(e => e.nombre === 'SEG')).toBeUndefined()
    expect(r.find(e => e.nombre === 'PRO')).toBeTruthy()
  })
})

function tareaCmm(nombre: string): TareaPropuesta {
  return { catalogoServicioId: nombre, nombre, cantidad: 1, nivelDificultad: 1, horaBase: 4, horaRepetido: 0, horasEstimadas: 4, incluida: true, orden: 0 }
}

const LAS_12_TAREAS_CMM = [
  'Protocolos de Comisionamiento',
  'Pruebas Eléctricas de Precomisionamiento',
  'Pruebas Neumáticas',
  'Calibración de Instrumentos',
  'Energización de Tableros',
  'Pruebas de Lazo (Loop Check)',
  'Comisionamiento de Comunicaciones',
  'Pruebas de Enclavamientos',
  'Comisionamiento en Frío',
  'Comisionamiento en Caliente',
  'Puesta en Marcha del Sistema',
  'Informe de Comisionamiento',
]

describe('evaluarSubalcanceCMM', () => {
  it('instrumentacion=true si algún servicio ya seleccionado (fuera de CMM) tiene el tag Instrumentacion', () => {
    const s = evaluarSubalcanceCMM([{ actividadTag: ['Instrumentacion'] }], ['ING'], '')
    expect(s.instrumentacion).toBe(true)
  })

  it('plcOHmi=true si PLC o HMI están entre los EDTs ya seleccionados', () => {
    expect(evaluarSubalcanceCMM([], ['PLC'], '').plcOHmi).toBe(true)
    expect(evaluarSubalcanceCMM([], ['HMI'], '').plcOHmi).toBe(true)
    expect(evaluarSubalcanceCMM([], ['CON'], '').plcOHmi).toBe(false)
  })

  it('neumatica/proceso se detectan por texto en la descripción libre del Paso 1', () => {
    expect(evaluarSubalcanceCMM([], [], 'Incluye líneas neumáticas para el actuador').neumatica).toBe(true)
    expect(evaluarSubalcanceCMM([], [], 'Arranque de equipos y puesta en marcha de planta').proceso).toBe(true)
    expect(evaluarSubalcanceCMM([], [], 'Solo cableado y tendido de bandejas').neumatica).toBe(false)
    expect(evaluarSubalcanceCMM([], [], 'Solo cableado y tendido de bandejas').proceso).toBe(false)
  })

  it('sin ninguna señal, todo el sub-alcance queda en false', () => {
    expect(evaluarSubalcanceCMM([], [], '')).toEqual({ instrumentacion: false, plcOHmi: false, neumatica: false, proceso: false })
  })
})

describe('aplicarSubalcanceCMM', () => {
  const SUBALCANCE_VACIO = { instrumentacion: false, plcOHmi: false, neumatica: false, proceso: false }

  it('con sub-alcance vacío, solo quedan incluidas las 4 tareas "siempre" (protocolos/pruebas eléctricas/energización/informe)', () => {
    const r = aplicarSubalcanceCMM(LAS_12_TAREAS_CMM.map(tareaCmm), SUBALCANCE_VACIO)
    const incluidas = r.filter(t => t.incluida).map(t => t.nombre).sort()
    expect(incluidas).toEqual(
      ['Protocolos de Comisionamiento', 'Pruebas Eléctricas de Precomisionamiento', 'Energización de Tableros', 'Informe de Comisionamiento'].sort()
    )
    const excluida = r.find(t => t.nombre === 'Pruebas Neumáticas')!
    expect(excluida.motivoExclusion).toBeTruthy()
  })

  it('caso G300 (solo CON): sin instrumentación/PLC-HMI/neumática/proceso detectados, solo las 4 "siempre" — nunca revienta ni deja CMM vacío', () => {
    const subalcanceG300 = evaluarSubalcanceCMM([], ['CON'], '')
    const r = aplicarSubalcanceCMM(LAS_12_TAREAS_CMM.map(tareaCmm), subalcanceG300)
    expect(r.some(t => t.incluida)).toBe(true)
    expect(r.find(t => t.nombre === 'Energización de Tableros')!.incluida).toBe(true)
  })

  it('con instrumentación detectada, se incluyen loop check y calibración', () => {
    const subalcance = { ...SUBALCANCE_VACIO, instrumentacion: true }
    const r = aplicarSubalcanceCMM(LAS_12_TAREAS_CMM.map(tareaCmm), subalcance)
    expect(r.find(t => t.nombre === 'Calibración de Instrumentos')!.incluida).toBe(true)
    expect(r.find(t => t.nombre === 'Pruebas de Lazo (Loop Check)')!.incluida).toBe(true)
    expect(r.find(t => t.nombre === 'Comisionamiento de Comunicaciones')!.incluida).toBe(false)
  })

  it('con PLC/HMI detectados, se incluyen comunicaciones y enclavamientos', () => {
    const subalcance = { ...SUBALCANCE_VACIO, plcOHmi: true }
    const r = aplicarSubalcanceCMM(LAS_12_TAREAS_CMM.map(tareaCmm), subalcance)
    expect(r.find(t => t.nombre === 'Comisionamiento de Comunicaciones')!.incluida).toBe(true)
    expect(r.find(t => t.nombre === 'Pruebas de Enclavamientos')!.incluida).toBe(true)
    expect(r.find(t => t.nombre === 'Calibración de Instrumentos')!.incluida).toBe(false)
  })

  it('con proceso detectado, se incluyen frío/caliente/puesta en marcha', () => {
    const subalcance = { ...SUBALCANCE_VACIO, proceso: true }
    const r = aplicarSubalcanceCMM(LAS_12_TAREAS_CMM.map(tareaCmm), subalcance)
    expect(r.find(t => t.nombre === 'Comisionamiento en Frío')!.incluida).toBe(true)
    expect(r.find(t => t.nombre === 'Comisionamiento en Caliente')!.incluida).toBe(true)
    expect(r.find(t => t.nombre === 'Puesta en Marcha del Sistema')!.incluida).toBe(true)
  })

  it('una tarea ya excluida por otra regla (ej. filtroAlcance) no se reincluye, no se le pisa el motivo, y no se le atribuye reglaClave (esta regla no participó en la decisión)', () => {
    const yaExcluida: TareaPropuesta = { ...tareaCmm('Pruebas Neumáticas'), incluida: false, motivoExclusion: 'Otro motivo previo' }
    const r = aplicarSubalcanceCMM([yaExcluida], { ...SUBALCANCE_VACIO, neumatica: true })
    expect(r[0].motivoExclusion).toBe('Otro motivo previo')
    expect(r[0].reglaClave).toBeUndefined()
  })

  it('una tarea con nombre no contemplado en la tabla (ej. catálogo cambió) queda siempre incluida, no revienta', () => {
    const r = aplicarSubalcanceCMM([tareaCmm('Tarea Nueva No Contemplada')], SUBALCANCE_VACIO)
    expect(r[0].incluida).toBe(true)
  })

  it('taggea reglaClave + incluidaPorRegla (snapshot inmutable) en toda tarea regida por una regla, tanto si queda incluida como excluida', () => {
    const r = aplicarSubalcanceCMM(
      [tareaCmm('Calibración de Instrumentos'), tareaCmm('Pruebas Neumáticas')],
      { ...SUBALCANCE_VACIO, instrumentacion: true }
    )
    const calibracion = r.find(t => t.nombre === 'Calibración de Instrumentos')!
    const neumaticas = r.find(t => t.nombre === 'Pruebas Neumáticas')!
    expect(calibracion.reglaClave).toBe('cmm.instrumentacion')
    expect(calibracion.incluidaPorRegla).toBe(true)
    expect(calibracion.incluida).toBe(true)
    expect(neumaticas.reglaClave).toBe('cmm.neumatica')
    expect(neumaticas.incluidaPorRegla).toBe(false)
    expect(neumaticas.incluida).toBe(false)
  })

  it('una tarea "siempre incluida" (sin entrada en la tabla) no tiene reglaClave', () => {
    const r = aplicarSubalcanceCMM([tareaCmm('Informe de Comisionamiento')], SUBALCANCE_VACIO)
    expect(r[0].reglaClave).toBeUndefined()
  })
})
