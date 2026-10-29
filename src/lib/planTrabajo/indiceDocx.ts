/**
 * Índice (TOC) del plan de trabajo exportado.
 *
 * La plantilla trae un campo TOC vacío marcado "dirty": solo Word lo llena, y
 * no lo hace en Vista protegida (todo .docx descargado abre así) ni en visores
 * como el de Drive/LibreOffice → el índice salía en blanco. Acá se pre-llena
 * con los títulos reales (Heading1/Heading2), cada uno con marcador e
 * hipervínculo. El número de página va como campo PAGEREF: Word lo calcula al
 * actualizar campos (`updateFields` de la plantilla); sin actualizar, el
 * índice igual se lee y sus entradas navegan.
 */

const ANCHO_TEXTO_TWIPS = 9630 // A4 (11905) − márgenes 1133×2
const PREFIJO_MARCADOR = '_TocGys'
const ID_MARCADOR_INICIAL = 90000

const NIVEL_POR_ESTILO: Record<string, 1 | 2> = { Heading1: 1, Heading2: 2 }

const escaparXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function textoDelParrafo(p: string): string {
  return (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) ?? [])
    .map(t => t.replace(/<[^>]+>/g, ''))
    .join('')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .trim()
}

/** Como la referencia NEXA: "1." | tab | "OBJETIVO" ------- página. */
function parrafoEntrada(texto: string, nivel: 1 | 2, marcador: string, prefijoCampo = ''): string {
  const rPr = nivel === 1 ? '<w:rPr><w:b/><w:bCs/></w:rPr>' : ''
  const [, numero, titulo] = texto.match(/^(\d+(?:\.\d+)*\.?)\s+(.+)$/) ?? [null, '', texto]
  return (
    `<w:p><w:pPr><w:pStyle w:val="TOC${nivel}"/><w:tabs><w:tab w:val="right" w:leader="hyphen" w:pos="${ANCHO_TEXTO_TWIPS}"/></w:tabs></w:pPr>` +
    prefijoCampo +
    `<w:hyperlink w:anchor="${marcador}" w:history="1">` +
    (numero ? `<w:r>${rPr}<w:t xml:space="preserve">${escaparXml(numero)}</w:t></w:r><w:r>${rPr}<w:tab/></w:r>` : '') +
    `<w:r>${rPr}<w:t xml:space="preserve">${escaparXml(titulo)}</w:t></w:r>` +
    `<w:r>${rPr}<w:tab/></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r>${rPr}<w:instrText xml:space="preserve"> PAGEREF ${marcador} \\h </w:instrText></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>` +
    `<w:r>${rPr}<w:t></w:t></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>` +
    `</w:hyperlink></w:p>`
  )
}

/** Marca cada título con un marcador y llena el contenido del campo TOC. Sin TOC en el documento, no toca nada. */
export function poblarIndice(documentXml: string): { xml: string; entradas: number } {
  const tocMatch = documentXml.match(/<w:sdtContent>(?:(?!<\/w:sdtContent>)[\s\S])*?<w:instrText[^>]*>\s*TOC [^<]*<\/w:instrText>[\s\S]*?<\/w:sdtContent>/)
  if (!tocMatch || tocMatch.index === undefined) return { xml: documentXml, entradas: 0 }
  const instr = tocMatch[0].match(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/)![1]
  const finToc = tocMatch.index + tocMatch[0].length
  // Niveles que pide el propio campo: \o "1-1" → solo títulos de nivel 1.
  const nivelMaximo = Number(instr.match(/\\o (?:&quot;|")\d-(\d)/)?.[1] ?? 2)

  const entradas: { texto: string; nivel: 1 | 2; marcador: string }[] = []
  let siguienteId = ID_MARCADOR_INICIAL
  // Solo los títulos DESPUÉS del índice (los de antes serían la carátula).
  const cuerpo = documentXml.slice(finToc).replace(/<w:p>(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, p => {
    const estilo = p.match(/<w:pStyle w:val="([^"]+)"\/>/)?.[1]
    const nivel = estilo ? NIVEL_POR_ESTILO[estilo] : undefined
    if (!nivel || nivel > nivelMaximo) return p
    const texto = textoDelParrafo(p)
    if (!texto) return p
    const id = siguienteId++
    const marcador = `${PREFIJO_MARCADOR}${id}`
    entradas.push({ texto, nivel, marcador })
    const inicio = `<w:bookmarkStart w:id="${id}" w:name="${marcador}"/>`
    const conInicio = p.includes('</w:pPr>') ? p.replace('</w:pPr>', `</w:pPr>${inicio}`) : p.replace('<w:p>', `<w:p>${inicio}`)
    return conInicio.replace(/<\/w:p>$/, `<w:bookmarkEnd w:id="${id}"/></w:p>`)
  })
  if (entradas.length === 0) return { xml: documentXml, entradas: 0 }

  const inicioCampo =
    `<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve">${instr}</w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="separate"/></w:r>`
  const contenido =
    entradas.map((e, i) => parrafoEntrada(e.texto, e.nivel, e.marcador, i === 0 ? inicioCampo : '')).join('') +
    `<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`

  const xml = documentXml.slice(0, tocMatch.index) + `<w:sdtContent>${contenido}</w:sdtContent>` + cuerpo
  return { xml, entradas: entradas.length }
}

const ESTILOS_TOC =
  `<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/>` +
  `<w:pPr><w:tabs><w:tab w:val="left" w:pos="851"/></w:tabs><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>` +
  `<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/>` +
  `<w:pPr><w:tabs><w:tab w:val="left" w:pos="1700"/></w:tabs><w:spacing w:before="0" w:after="60"/><w:ind w:left="851"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>`

/**
 * Estilos del índice: TOC1/TOC2 (si la plantilla no los trae) y nivel de esquema
 * en Heading1-3, para que Word los reconozca al regenerar el índice.
 */
export function asegurarEstilosIndice(stylesXml: string): string {
  let xml = stylesXml
  for (const [n, nivel] of [[1, 0], [2, 1], [3, 2]] as const) {
    xml = xml.replace(
      new RegExp(`(<w:style [^>]*w:styleId="Heading${n}">)((?:(?!</w:style>)[\\s\\S])*?)(</w:style>)`),
      (m, ini: string, cuerpo: string, fin: string) => {
        if (cuerpo.includes('<w:outlineLvl')) return m
        const conNivel = cuerpo.includes('<w:pPr>')
          ? cuerpo.replace('</w:pPr>', `<w:outlineLvl w:val="${nivel}"/></w:pPr>`) // outlineLvl va al final del pPr (orden del esquema)
          : cuerpo.replace(/(<w:rPr>)/, `<w:pPr><w:keepNext/><w:outlineLvl w:val="${nivel}"/></w:pPr>$1`)
        return ini + conNivel + fin
      }
    )
  }
  if (!xml.includes('w:styleId="TOC1"')) xml = xml.replace('</w:styles>', `${ESTILOS_TOC}</w:styles>`)
  return xml
}
