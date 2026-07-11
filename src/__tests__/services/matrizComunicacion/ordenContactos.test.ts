import { ordenarPorJerarquiaCargo } from '@/lib/matrizComunicacion/ordenContactos'

describe('ordenarPorJerarquiaCargo', () => {
  it('ordena Gerencia de Proyectos > Gestor > Residente > Supervisor > resto', () => {
    const personas = [
      { nombre: 'Tito Álvarez', cargo: 'Supervisor' },
      { nombre: 'Armando Chumbes', cargo: 'Cadista' },
      { nombre: 'Piero Ríos', cargo: 'Gestor de Proyectos' },
      { nombre: 'Alonso Piscoya', cargo: 'Residente' },
      { nombre: 'Jesús Mamani', cargo: 'Gerencia de Proyectos' },
    ]
    const ordenado = ordenarPorJerarquiaCargo(personas)
    expect(ordenado.map(p => p.nombre)).toEqual([
      'Jesús Mamani', // Gerencia de Proyectos
      'Piero Ríos', // Gestor
      'Alonso Piscoya', // Residente
      'Tito Álvarez', // Supervisor
      'Armando Chumbes', // resto
    ])
  })

  it('no confunde "Gerencia de Proyectos" (corporativo) con "Gestor de Proyectos" (de proyecto) — mismo caso real de G300', () => {
    const personas = [
      { nombre: 'Piero Ríos', cargo: 'Gestor de Proyectos' },
      { nombre: 'Jesús Mamani', cargo: 'Gerencia de Proyectos' },
    ]
    const ordenado = ordenarPorJerarquiaCargo(personas)
    expect(ordenado[0].nombre).toBe('Jesús Mamani')
    expect(ordenado[1].nombre).toBe('Piero Ríos')
  })

  it('mantiene el orden de llegada entre empates del mismo rango ("resto")', () => {
    const personas = [
      { nombre: 'A', cargo: 'Cadista' },
      { nombre: 'B', cargo: 'Técnico Instrumentista' },
      { nombre: 'C', cargo: 'SSOMA' },
    ]
    const ordenado = ordenarPorJerarquiaCargo(personas)
    expect(ordenado.map(p => p.nombre)).toEqual(['A', 'B', 'C'])
  })

  it('no muta el arreglo original', () => {
    const personas = [{ nombre: 'Tito', cargo: 'Supervisor' }, { nombre: 'Piero', cargo: 'Gestor' }]
    const copia = [...personas]
    ordenarPorJerarquiaCargo(personas)
    expect(personas).toEqual(copia)
  })
})
