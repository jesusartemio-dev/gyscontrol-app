import { normalizarTexto, emparejarFilaConEdt, elegirResponsableDeFila, type EdtParaMatching } from '@/lib/matrizComunicacion/autoasignarResponsables'
import type { PersonaResoluble } from '@/lib/matrizComunicacion/utils'

describe('normalizarTexto', () => {
  it('pasa a minúsculas y quita tildes', () => {
    expect(normalizarTexto('Construcción')).toBe('construccion')
    expect(normalizarTexto('  Gestión  ')).toBe('gestion')
  })
})

describe('emparejarFilaConEdt', () => {
  const edts: EdtParaMatching[] = [
    { proyectoEdtId: 'e1', nombre: 'Construccion', codigo: 'CON' },
    { proyectoEdtId: 'e2', nombre: 'Comisionamiento', codigo: 'CMM' },
  ]

  it('matchea por texto exacto normalizado (mayúsculas/tildes no importan)', () => {
    expect(emparejarFilaConEdt('construcción', edts)?.codigo).toBe('CON')
    expect(emparejarFilaConEdt('COMISIONAMIENTO', edts)?.codigo).toBe('CMM')
  })

  it('sin match real (ej. fila "Comercial" o renombrada a mano) devuelve null, nunca inventa', () => {
    expect(emparejarFilaConEdt('Comercial', edts)).toBeNull()
    expect(emparejarFilaConEdt('Nueva actividad', edts)).toBeNull()
  })
})

describe('elegirResponsableDeFila', () => {
  const personal: PersonaResoluble[] = [
    { siglas: 'JM', userId: 'user-jm', esCliente: false },
    { siglas: 'PR', userId: 'user-pr', esCliente: false },
    { siglas: 'APH', userId: 'user-aph', esCliente: false },
    { siglas: 'CLI', userId: null, esCliente: true },
  ]

  it('elige a la persona con código R (Autoriza)', () => {
    const r = elegirResponsableDeFila(
      [{ siglas: 'JM', valor: 'DS' }, { siglas: 'PR', valor: 'R' }],
      personal
    )
    expect(r).toEqual({ userId: 'user-pr', codigoOrigen: 'R', advertencia: null })
  })

  it('detecta R dentro de un código combinado (ej. "DR", "ER")', () => {
    const r = elegirResponsableDeFila([{ siglas: 'APH', valor: 'ER' }], personal)
    expect(r.userId).toBe('user-aph')
    expect(r.codigoOrigen).toBe('R')
  })

  it('sin nadie con R, cae a E (Emisor)', () => {
    const r = elegirResponsableDeFila(
      [{ siglas: 'JM', valor: 'D' }, { siglas: 'PR', valor: 'E' }],
      personal
    )
    expect(r).toEqual({ userId: 'user-pr', codigoOrigen: 'E', advertencia: null })
  })

  it('varias personas con R: toma la primera y advierte', () => {
    const r = elegirResponsableDeFila(
      [{ siglas: 'JM', valor: 'R' }, { siglas: 'PR', valor: 'DR' }],
      personal
    )
    expect(r.userId).toBe('user-jm')
    expect(r.codigoOrigen).toBe('R')
    expect(r.advertencia).toMatch(/Varias personas con código "R"/)
  })

  it('sin R ni E en ninguna celda: no asigna a nadie y advierte', () => {
    const r = elegirResponsableDeFila(
      [{ siglas: 'JM', valor: 'D' }, { siglas: 'PR', valor: 'S' }],
      personal
    )
    expect(r.userId).toBeNull()
    expect(r.codigoOrigen).toBeNull()
    expect(r.advertencia).toMatch(/Sin persona con código/)
  })

  it('nunca asigna a un cliente aunque tenga código R', () => {
    const r = elegirResponsableDeFila([{ siglas: 'CLI', valor: 'R' }], personal)
    expect(r.userId).toBeNull()
    expect(r.codigoOrigen).toBeNull()
  })

  it('una sigla obsoleta (ya no resuelve a nadie, ej. organigrama cambió) se ignora, no revienta', () => {
    const r = elegirResponsableDeFila(
      [{ siglas: 'XYZ-YA-NO-EXISTE', valor: 'R' }, { siglas: 'PR', valor: 'E' }],
      personal
    )
    expect(r.userId).toBe('user-pr')
    expect(r.codigoOrigen).toBe('E')
  })
})
