import { derivarEdtsSoporte } from '@/lib/cronogramaIA/derivarEdtsSoporte'

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

  it('sin TAB/PLC/HMI, no se sugiere CMM', () => {
    const r = derivarEdtsSoporte(['e-con'], CATALOGO)
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
