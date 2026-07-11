import { calcularRolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'

describe('calcularRolResponsable', () => {
  it('GES, PRO y CIE (sin excepción) resuelven a gestor', () => {
    expect(calcularRolResponsable({ edtCodigo: 'GES' })).toBe('gestor')
    expect(calcularRolResponsable({ edtCodigo: 'PRO' })).toBe('gestor')
    expect(calcularRolResponsable({ edtCodigo: 'CIE' })).toBe('gestor')
  })

  it('ING, PLA, HMI, TAB y PLC resuelven a residente', () => {
    expect(calcularRolResponsable({ edtCodigo: 'ING' })).toBe('residente')
    expect(calcularRolResponsable({ edtCodigo: 'PLA' })).toBe('residente')
    expect(calcularRolResponsable({ edtCodigo: 'HMI' })).toBe('residente')
    expect(calcularRolResponsable({ edtCodigo: 'TAB' })).toBe('residente')
    // PLC -> residente (trabajo de oficina, no de campo) — confirmado tras
    // la corrección: no es Supervisor.
    expect(calcularRolResponsable({ edtCodigo: 'PLC' })).toBe('residente')
  })

  it('CON y CMM resuelven a supervisor', () => {
    expect(calcularRolResponsable({ edtCodigo: 'CON' })).toBe('supervisor')
    expect(calcularRolResponsable({ edtCodigo: 'CMM' })).toBe('supervisor')
  })

  it('SEG resuelve a ssoma para TODO el EDT (corrección: ya no es residente con excepción por tarea)', () => {
    expect(calcularRolResponsable({ edtCodigo: 'SEG' })).toBe('ssoma')
    expect(calcularRolResponsable({ edtCodigo: 'SEG', tareaNombre: 'Envío y Aprobación de Documentos HSE' })).toBe('ssoma')
    expect(calcularRolResponsable({ edtCodigo: 'SEG', tareaNombre: 'Elaboración de IPERC' })).toBe('ssoma')
    expect(calcularRolResponsable({ edtCodigo: 'SEG', tareaNombre: 'Elaboración de MEPP' })).toBe('ssoma')
    expect(calcularRolResponsable({ edtCodigo: 'SEG', tareaNombre: 'Elaboración de PETS' })).toBe('ssoma')
    expect(calcularRolResponsable({ edtCodigo: 'SEG', tareaNombre: 'Habilitación HSE de Personal' })).toBe('ssoma')
  })

  it('EDTs no cubiertos por la tabla (ej. PRE, GEN legacy) devuelven null — nunca se inventa', () => {
    expect(calcularRolResponsable({ edtCodigo: 'PRE' })).toBeNull()
    expect(calcularRolResponsable({ edtCodigo: 'GEN' })).toBeNull()
    expect(calcularRolResponsable({ edtCodigo: 'INEXISTENTE' })).toBeNull()
  })

  describe('excepción CIE (Técnico/Gestión)', () => {
    it('"Cierre Técnico" resuelve a supervisor', () => {
      expect(calcularRolResponsable({ edtCodigo: 'CIE', actividadNombre: 'Cierre Técnico' })).toBe('supervisor')
    })
    it('"Cierre de Gestión" resuelve a gestor', () => {
      expect(calcularRolResponsable({ edtCodigo: 'CIE', actividadNombre: 'Cierre de Gestión' })).toBe('gestor')
    })
    it('nombre de actividad no reconocido cae al rol base (gestor)', () => {
      expect(calcularRolResponsable({ edtCodigo: 'CIE', actividadNombre: 'Otro nombre cualquiera' })).toBe('gestor')
    })
  })
})
