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
