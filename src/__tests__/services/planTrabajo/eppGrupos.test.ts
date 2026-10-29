import { agruparEpp, grupoDeEpp, textoItemLista } from '@/lib/planTrabajo/eppGrupos'

describe('eppGrupos', () => {
  it('deduce el grupo por palabras clave y respeta el grupo explícito', () => {
    expect(grupoDeEpp({ nombre: 'Línea de vida retráctil con doble gancho' })).toBe('Altura')
    expect(grupoDeEpp({ nombre: 'Mandil de cuero' })).toBe('Trabajos en Caliente')
    expect(grupoDeEpp({ nombre: 'Traje contra el arco eléctrico con capucha' })).toBe('Trabajos Eléctricos')
    expect(grupoDeEpp({ nombre: 'Algo raro' })).toBe('Otros')
    expect(grupoDeEpp({ nombre: 'Arnés', grupo: 'Espacios confinados' })).toBe('Espacios confinados')
  })

  it('agrupa básico + bioseguridad a la izquierda y riesgo específico por grupo en orden de aparición', () => {
    const r = agruparEpp({
      basico: [{ nombre: 'Casco' }],
      bioseguridad: [{ nombre: 'Mascarilla KN95' }],
      riesgoEspecifico: [{ nombre: 'Arnés de 4 argollas' }, { nombre: 'Polainas' }, { nombre: 'Línea de vida' }],
    })
    expect(r.basico.map(g => g.titulo)).toEqual(['EPP Generales', 'EPP Bioseguridad'])
    expect(r.riesgoEspecifico).toEqual([
      { titulo: 'EPP Altura', items: [{ texto: 'Arnés de 4 argollas.' }, { texto: 'Línea de vida.' }] },
      { titulo: 'EPP Trabajos en Caliente', items: [{ texto: 'Polainas.' }] },
    ])
  })

  it('texto de la lista: norma entre paréntesis solo si hay, y punto final sin duplicar', () => {
    expect(textoItemLista('Casco', 'ANSI Z89.1')).toBe('Casco (ANSI Z89.1).')
    expect(textoItemLista('Casco', '')).toBe('Casco.')
    expect(textoItemLista('Laptop.')).toBe('Laptop.')
  })
})
