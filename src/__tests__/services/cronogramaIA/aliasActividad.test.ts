import {
  derivarAliasCandidato,
  resolverAliasParaNombres,
  prefijarNombreTarea,
  aplicarPrefijoDeActividad,
} from '@/lib/cronogramaIA/aliasActividad'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

describe('derivarAliasCandidato — derivación determinística con stopwords', () => {
  it('descarta conectores no distintivos (zona/área/de/del/por/tablero) y toma la primera palabra distintiva', () => {
    expect(derivarAliasCandidato('Zona Elevador G300')).toBe('Elevador')
    expect(derivarAliasCandidato('Tablero TC-001')).toBe('TC-001')
  })

  it('sin ninguna palabra distintiva (catch-all), usa la primera palabra cruda tal cual', () => {
    expect(derivarAliasCandidato('General/Transversal')).toBe('General')
  })

  it('trunca a 12 caracteres', () => {
    expect(derivarAliasCandidato('Programación Avanzada de Controladores').length).toBeLessThanOrEqual(12)
  })

  it('el índice permite pedir la siguiente palabra distintiva (para resolver colisiones)', () => {
    expect(derivarAliasCandidato('Cuarto MCC 82-90', 0)).toBe('Cuarto')
    expect(derivarAliasCandidato('Cuarto MCC 82-90', 1)).toBe('MCC')
    expect(derivarAliasCandidato('Cuarto MCC 82-90', 2)).toBe('82-90')
  })
})

describe('resolverAliasParaNombres — unicidad con colisiones', () => {
  it('dos zonas con el mismo alias propuesto ("MCC") — la segunda se resuelve a otro valor único', () => {
    const resultado = resolverAliasParaNombres([
      { nombre: 'Sala MCC 70-81', aliasPropuesto: 'MCC' },
      { nombre: 'Cuarto MCC 82-90', aliasPropuesto: 'MCC' },
    ])
    const alias1 = resultado.get('Sala MCC 70-81')
    const alias2 = resultado.get('Cuarto MCC 82-90')
    expect(alias1).toBe('MCC')
    expect(alias2).toBeDefined()
    expect(alias2).not.toBe(alias1)
  })

  it('sin alias propuesto, deriva genéricamente y sigue garantizando unicidad', () => {
    const resultado = resolverAliasParaNombres([{ nombre: 'Zona Elevador G300' }, { nombre: 'Zona Elevador Norte' }])
    const valores = Array.from(resultado.values())
    expect(new Set(valores.map(v => v.toLowerCase())).size).toBe(2)
  })

  it('un alias propuesto inválido (multi-palabra o vacío) se descarta y se deriva del nombre', () => {
    const resultado = resolverAliasParaNombres([{ nombre: 'Zona Elevador G300', aliasPropuesto: 'zona elevador' }])
    expect(resultado.get('Zona Elevador G300')).toBe('Elevador')
  })

  it('último recurso: si se agotan las palabras distintivas, usa un sufijo numérico único', () => {
    const resultado = resolverAliasParaNombres([
      { nombre: 'MCC', aliasPropuesto: 'MCC' },
      { nombre: 'MCC (2)', aliasPropuesto: 'MCC' },
    ])
    const valores = Array.from(resultado.values())
    expect(new Set(valores.map(v => v.toLowerCase())).size).toBe(2)
  })
})

describe('prefijarNombreTarea — largo máximo', () => {
  it('antepone "{alias} - " al nombre de la tarea', () => {
    expect(prefijarNombreTarea('Elevador', 'Armado de Andamios')).toBe('Elevador - Armado de Andamios')
  })

  it('recorta el nombre de tarea si el total supera el largo máximo', () => {
    const resultado = prefijarNombreTarea('MCC', 'Instalación de bandejas portacables en todo el recorrido eléctrico', 45)
    expect(resultado.length).toBeLessThanOrEqual(45)
    expect(resultado.startsWith('MCC - ')).toBe(true)
  })
})

describe('aplicarPrefijoDeActividad — solo con 2+ Actividades', () => {
  function actividad(nombre: string, nombresTarea: string[]): ActividadPropuesta {
    return {
      edtNombre: 'CON',
      actividadNombre: nombre,
      origen: 'ia',
      tareas: nombresTarea.map(n => ({
        catalogoServicioId: `id-${n}`,
        nombre: n,
        cantidad: 1,
        nivelDificultad: 1,
        horaBase: 1,
        horaRepetido: 0,
        horasEstimadas: 1,
        incluida: true,
        orden: 0,
      })),
    }
  }

  it('con una sola Actividad, NO prefija (el prefijo sería ruido)', () => {
    const resultado = aplicarPrefijoDeActividad([actividad('Sala Eléctrica', ['Armado de Andamios'])])
    expect(resultado[0].tareas[0].nombre).toBe('Armado de Andamios')
  })

  it('con 2+ Actividades, prefija cada tarea con el alias de su Actividad', () => {
    const resultado = aplicarPrefijoDeActividad([
      actividad('Zona Elevador G300', ['Armado de Andamios']),
      actividad('Sala MCC 70-81', ['Armado de Andamios']),
    ])
    expect(resultado[0].tareas[0].nombre).toBe('Elevador - Armado de Andamios')
    expect(resultado[1].tareas[0].nombre).toMatch(/^Sala - Armado de Andamios$|^MCC - Armado de Andamios$/)
  })

})
