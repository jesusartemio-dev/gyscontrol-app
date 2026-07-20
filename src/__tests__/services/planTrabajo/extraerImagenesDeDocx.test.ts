import PizZip from 'pizzip'
import { extraerImagenesDeDocx } from '@/lib/planTrabajo/extraerImagenesDeDocx'

/** Arma un .docx mínimo pero real (mismo layout que genera la plantilla real: imagen en un párrafo, "Figura N." en el siguiente) para no depender del archivo de plantilla real en el test. */
function construirDocxDePrueba(opciones: {
  imagenes: { rId: string; mediaPath: string; captionSiguiente: string | null }[]
  mediaBytes?: Record<string, string>
}): Buffer {
  const rels = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ...opciones.imagenes.map(
      img => `<Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${img.mediaPath}"/>`
    ),
    '</Relationships>',
  ].join('')

  const parrafos = opciones.imagenes.flatMap(img => {
    const parrafoImagen = `<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="${img.rId}"/></a:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
    const parrafoCaption = img.captionSiguiente !== null
      ? `<w:p><w:r><w:t>${img.captionSiguiente}</w:t></w:r></w:p>`
      : ''
    return [parrafoImagen, parrafoCaption]
  })

  const documentXml = `<?xml version="1.0" encoding="UTF-8"?><w:document>${parrafos.join('')}</w:document>`

  const zip = new PizZip()
  zip.file('word/_rels/document.xml.rels', rels)
  zip.file('word/document.xml', documentXml)
  for (const img of opciones.imagenes) {
    const bytesTexto = opciones.mediaBytes?.[img.mediaPath] ?? 'contenido-de-prueba'
    zip.file(img.mediaPath, bytesTexto)
  }

  return zip.generate({ type: 'nodebuffer' })
}

describe('extraerImagenesDeDocx', () => {
  it('detecta una imagen con caption "Figura N." y extrae el número correctamente', () => {
    const buffer = construirDocxDePrueba({
      imagenes: [{ rId: 'rId5', mediaPath: 'media/image1.png', captionSiguiente: 'Figura 3. Ensamblar andamio certificado.' }],
    })

    const resultado = extraerImagenesDeDocx(buffer)

    expect(resultado).toHaveLength(1)
    expect(resultado[0].numeroFigura).toBe(3)
    expect(resultado[0].mimeType).toBe('image/png')
    expect(resultado[0].nombreArchivoOriginal).toBe('image1.png')
    expect(resultado[0].bytes.toString()).toBe('contenido-de-prueba')
  })

  it('una imagen SIN el patrón "Figura N." (pegada a mano en Word) devuelve numeroFigura null', () => {
    const buffer = construirDocxDePrueba({
      imagenes: [{ rId: 'rId5', mediaPath: 'media/image1.png', captionSiguiente: 'Una foto cualquiera que el usuario pegó.' }],
    })

    const resultado = extraerImagenesDeDocx(buffer)

    expect(resultado).toHaveLength(1)
    expect(resultado[0].numeroFigura).toBeNull()
  })

  it('una imagen sin ningún párrafo siguiente (última del documento) no revienta y da numeroFigura null', () => {
    const buffer = construirDocxDePrueba({
      imagenes: [{ rId: 'rId5', mediaPath: 'media/image1.png', captionSiguiente: null }],
    })

    const resultado = extraerImagenesDeDocx(buffer)

    expect(resultado).toHaveLength(1)
    expect(resultado[0].numeroFigura).toBeNull()
  })

  it('varias imágenes conservan su orden de aparición y cada una matchea su propio "Figura N."', () => {
    const buffer = construirDocxDePrueba({
      imagenes: [
        { rId: 'rId5', mediaPath: 'media/image1.png', captionSiguiente: 'Figura 1. Primera.' },
        { rId: 'rId6', mediaPath: 'media/image2.jpg', captionSiguiente: 'Figura 2. Segunda.' },
        { rId: 'rId7', mediaPath: 'media/image3.png', captionSiguiente: 'Foto nueva sin numerar.' },
      ],
    })

    const resultado = extraerImagenesDeDocx(buffer)

    expect(resultado).toHaveLength(3)
    expect(resultado.map(r => r.orden)).toEqual([0, 1, 2])
    expect(resultado[0].numeroFigura).toBe(1)
    expect(resultado[1].numeroFigura).toBe(2)
    expect(resultado[2].numeroFigura).toBeNull()
  })

  it('un .docx / buffer completamente inválido no revienta — devuelve lista vacía', () => {
    const bufferInvalido = Buffer.from('esto no es un zip valido')
    expect(extraerImagenesDeDocx(bufferInvalido)).toEqual([])
  })

  it('una relación (r:embed) que no resuelve a ningún archivo real en el zip se ignora sin reventar', () => {
    const zip = new PizZip()
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0"?><Relationships></Relationships>')
    zip.file(
      'word/document.xml',
      '<?xml version="1.0"?><w:document><w:p><w:r><w:drawing><a:blip r:embed="rId99"/></w:drawing></w:r></w:p></w:document>'
    )
    const buffer = zip.generate({ type: 'nodebuffer' })

    expect(extraerImagenesDeDocx(buffer)).toEqual([])
  })
})
