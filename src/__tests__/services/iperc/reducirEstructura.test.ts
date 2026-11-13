import { combinarNombres, combinarNombresTarea } from '@/lib/iperc/reducirEstructura'

describe('combinarNombres', () => {
  it('junta el tramo que cambia y deja igual lo que comparten', () => {
    // Las dos actividades reales de CJM52 con las mismas cinco tareas.
    expect(combinarNombres([
      'Tramo 1 - Filtro D2112 - Sala 320K',
      'Tramo 2 - Filtro D2122 - Sala 320K',
    ])).toBe('Tramo 1 y 2 - Filtro D2112 y D2122 - Sala 320K')
  })

  it('con tres o más enumera como se escribe en castellano', () => {
    expect(combinarNombres(['Filtro D2112', 'Filtro D2122', 'Filtro D2088']))
      .toBe('Filtro D2112, D2122 y D2088')
  })

  it('sin nada en común une los nombres enteros', () => {
    expect(combinarNombres(['Montaje de tablero', 'Instalación de bandejas']))
      .toBe('Montaje de tablero y Instalación de bandejas')
  })

  it('con distinta cantidad de tramos no inventa estructura', () => {
    expect(combinarNombres(['Sala 320K', 'Tramo 1 - Sala 320K']))
      .toBe('Sala 320K y Tramo 1 - Sala 320K')
  })

  it('nombres repetidos dan uno solo', () => {
    expect(combinarNombres(['Filtro D2112', 'Filtro D2112'])).toBe('Filtro D2112')
  })

  it('un solo nombre se devuelve tal cual', () => {
    expect(combinarNombres(['Filtro D2112'])).toBe('Filtro D2112')
  })
})

describe('combinarNombresTarea', () => {
  it('se cae el prefijo del tramo, que ya está en el título de la actividad', () => {
    expect(combinarNombresTarea([
      'T1-D2112 - Armado de Andamios',
      'T2-D2122 - Armado de Andamios',
    ])).toBe('Armado de Andamios')
  })

  it('lo mismo con tres equipos', () => {
    expect(combinarNombresTarea([
      'D2112 - Conexionado en Tablero',
      'D2122 - Conexionado en Tablero',
      'D2088 - Conexionado en Tablero',
    ])).toBe('Conexionado en Tablero')
  })

  it('si cambia algo más que el prefijo, no se tira nada', () => {
    expect(combinarNombresTarea([
      'T1 - Armado de Andamios',
      'T2 - Desmontaje de Andamios',
    ])).toBe('T1 y T2 - Armado de Andamios y Desmontaje de Andamios')
  })

  it('parte por guion largo y flecha, no solo por el guion', () => {
    // Las tres tareas de "Fusionado y Certificación de FO" en CJM52: la
    // segunda usa flecha donde las otras usan guion.
    expect(combinarNombresTarea([
      'T1 Fusionado FO 12H – Filtro D2112 - Gabinete COM 320K',
      'T2 Fusionado FO 12H – Filtro D2122 → Gabinete COM 320K',
      'T3 Fusionado FO 12H – Filtro D2088 - Gabinete COM 320K',
    ])).toBe('Fusionado FO 12H - Filtro D2112, D2122 y D2088 - Gabinete COM 320K')
  })

  it('el T1/T2 que numera el tramo se cae, pero una palabra que nombra no', () => {
    // "T1" solo dice de qué tramo se habla; "Armado" es lo que la tarea hace.
    expect(combinarNombresTarea(['T1 Tendido de FO', 'T2 Tendido de FO']))
      .toBe('Tendido de FO')
    expect(combinarNombresTarea(['Armado de Andamios', 'Desmontaje de Andamios']))
      .toBe('Armado de Andamios y Desmontaje de Andamios')
  })

  it('tareas sin prefijo se combinan como cualquier nombre', () => {
    expect(combinarNombresTarea(['Armado de Andamios', 'Armado de andamio de 2.5 cuerpos']))
      .toBe('Armado de Andamios y andamio de 2.5 cuerpos')
  })
})
