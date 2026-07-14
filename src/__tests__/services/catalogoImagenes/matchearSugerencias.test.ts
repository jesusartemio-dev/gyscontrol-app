import { matchearSugerenciasCatalogoImagen, type CatalogoImagenParaSugerir } from '@/lib/catalogoImagenes/matchearSugerencias'

const catalogo: CatalogoImagenParaSugerir[] = [
  { id: 'img-1', nombre: 'Roscadora automática', keywords: ['roscadora', 'rosca'], categoria: 'EQUIPO', activo: true },
  { id: 'img-2', nombre: 'Escalera dieléctrica', keywords: ['escalera', 'dielectrica'], categoria: 'EPP', activo: true },
  { id: 'img-3', nombre: 'Manta dieléctrica', keywords: ['manta'], categoria: 'EPP', activo: true },
  { id: 'img-4', nombre: 'Destornilladores dieléctricos', keywords: ['destornillador'], categoria: 'HERRAMIENTA', activo: false },
]

describe('matchearSugerenciasCatalogoImagen', () => {
  it('matchea por keyword contra el nombre de una herramienta del plan (sin tildes, case-insensitive)', () => {
    const sugeridas = matchearSugerenciasCatalogoImagen(catalogo, ['ROSCADORA MANUAL', 'Multímetro'])
    expect(sugeridas.map(s => s.id)).toEqual(['img-1'])
  })

  it('matchea por el nombre completo de la imagen contra el texto de una tarea', () => {
    const sugeridas = matchearSugerenciasCatalogoImagen(catalogo, ['Colocar escalera dielectrica en el área de trabajo'])
    expect(sugeridas.map(s => s.id)).toEqual(['img-2'])
  })

  it('ignora imágenes inactivas aunque matcheen', () => {
    const sugeridas = matchearSugerenciasCatalogoImagen(catalogo, ['usar destornillador dielectrico'])
    expect(sugeridas).toEqual([])
  })

  it('sin contexto (array vacío o solo strings vacíos) no sugiere nada', () => {
    expect(matchearSugerenciasCatalogoImagen(catalogo, [])).toEqual([])
    expect(matchearSugerenciasCatalogoImagen(catalogo, ['', '  '])).toEqual([])
  })

  it('nunca duplica la misma imagen aunque su keyword matchee en más de un texto de contexto', () => {
    // Ambos textos de contexto matchean img-3 vía la keyword "manta" — debe salir una sola vez.
    const sugeridas = matchearSugerenciasCatalogoImagen(catalogo, ['trae la manta para cubrir', 'ya tienes la manta lista'])
    expect(sugeridas.map(s => s.id)).toEqual(['img-3'])
  })

  it('sin ningún match, devuelve array vacío', () => {
    const sugeridas = matchearSugerenciasCatalogoImagen(catalogo, ['Tendido de cable de fuerza'])
    expect(sugeridas).toEqual([])
  })
})

describe('matchearSugerenciasCatalogoImagen — caso real reportado en producción (CJM49, Roscadora/tubería conduit)', () => {
  const roscadoraKeywordsDivididas: CatalogoImagenParaSugerir = {
    id: 'img-roscadora',
    nombre: 'Roscadora Automatica de 2 Velocidades',
    keywords: ['roscadora', 'roscado', 'tubería', 'tuberías', 'conduit'],
    categoria: 'EQUIPO',
    activo: true,
  }
  // Migración suave: dato heredado/editado fuera del formulario con las 5
  // keywords guardadas como UN solo elemento separado por comas (el defecto
  // que se sospechaba como causa del bug) — debe matchear igual, sin reeditar.
  const roscadoraKeywordsSinDividir: CatalogoImagenParaSugerir = {
    ...roscadoraKeywordsDivididas,
    keywords: ['roscadora, roscado, tubería, tuberías, conduit'],
  }

  const textoTarea = 'Elevador - Instalación de bandejas y tuberías conduit'
  const textoVineta = 'Instalar bandejas portacables y tubería conduit EMT según trazado establecido en planos.'

  it('con keywords ya divididas en el array (estado correcto actual) matchea contra el nombre de la tarea y la viñeta', () => {
    const sugeridas = matchearSugerenciasCatalogoImagen([roscadoraKeywordsDivididas], [textoTarea, textoVineta])
    expect(sugeridas.map(s => s.id)).toEqual(['img-roscadora'])
  })

  it('con las 5 keywords guardadas como un solo string separado por comas (dato heredado) también matchea — split defensivo', () => {
    const sugeridas = matchearSugerenciasCatalogoImagen([roscadoraKeywordsSinDividir], [textoTarea, textoVineta])
    expect(sugeridas.map(s => s.id)).toEqual(['img-roscadora'])
  })

  it('caso negativo: una tarea sin ninguna relación (ni por nombre ni por keyword) no sugiere la Roscadora', () => {
    const sugeridas = matchearSugerenciasCatalogoImagen(
      [roscadoraKeywordsDivididas],
      ['Excavación y relleno de zanjas para fundaciones']
    )
    expect(sugeridas).toEqual([])
  })
})
