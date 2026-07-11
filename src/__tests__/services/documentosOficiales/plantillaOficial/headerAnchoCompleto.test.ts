import { readFileSync } from 'fs'
import path from 'path'
import PizZip from 'pizzip'

// Regresión: el header1.xml (compartido, byte-idéntico, entre la Matriz y el
// Organigrama) traía la tabla del encabezado con ancho FIJO en dxa (9712,
// calculado para la página vertical) — en la sección apaisada del organigrama
// eso dejaba la tabla ocupando solo ~2/3 del ancho real. Fix: w:tblW en
// porcentaje (5000 = 100%), que se estira al ancho de CADA sección sin
// afectar cómo se ve en la página vertical.
const TEMPLATES = [
  ['Organigrama', path.join(process.cwd(), 'src/lib/services/Organigrama/plantilla_organigrama.docx')],
  ['Matriz', path.join(process.cwd(), 'src/lib/services/Matriz/plantilla_matriz_comunicacion.docx')],
] as const

describe.each(TEMPLATES)('header1.xml de %s — ancho de tabla del encabezado', (_nombre, rutaPlantilla) => {
  it('usa w:tblW en porcentaje (100%), no un ancho fijo en dxa', () => {
    const zip = new PizZip(readFileSync(rutaPlantilla))
    const header1Xml = zip.file('word/header1.xml')!.asText()

    expect(header1Xml).toContain('<w:tblW w:w="5000" w:type="pct"/>')
    expect(header1Xml).not.toMatch(/<w:tblW w:w="\d+" w:type="dxa"\/>/)
  })
})

it('ambas plantillas siguen compartiendo el mismo header1.xml byte a byte tras el fix', () => {
  const [, rutaOrganigrama] = TEMPLATES[0]
  const [, rutaMatriz] = TEMPLATES[1]
  const header1Organigrama = new PizZip(readFileSync(rutaOrganigrama)).file('word/header1.xml')!.asText()
  const header1Matriz = new PizZip(readFileSync(rutaMatriz)).file('word/header1.xml')!.asText()
  expect(header1Organigrama).toBe(header1Matriz)
})
