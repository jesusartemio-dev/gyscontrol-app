import PizZip from 'pizzip'

/**
 * Extrae el "Nº. NEXA" (código oficial del documento, ej.
 * "PN-I790126044-3GYS-0370COR0001") del header del .docx subido. Ese código
 * vive como texto literal en word/header1.xml (tras la etiqueta "Nº. NEXA:"),
 * no como campo en la DB — por eso se lee del archivo. Se usa para mostrarlo
 * en el historial de versiones (ver subir-version/completar).
 *
 * Defensivo a propósito: cualquier header con estructura inesperada devuelve
 * null en vez de romper la subida de la versión.
 */
export function extraerCodigoNexaDeDocx(buffer: Buffer): string | null {
  try {
    const zip = new PizZip(buffer)

    // Puede haber header1/2/3 (primera página, pares, impares). Se revisan todos.
    const headerFiles = Object.keys(zip.files).filter(f => /^word\/header\d+\.xml$/.test(f))
    if (headerFiles.length === 0) return null

    for (const hf of headerFiles) {
      const xml = zip.file(hf)?.asText()
      if (!xml) continue

      // Texto de cada párrafo, en orden, para poder mirar "el que sigue a NEXA".
      const textos = xml
        .split('</w:p>')
        .map(p =>
          Array.from(p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g))
            .map(m => m[1])
            .join('')
            .trim()
        )
        .filter(t => t.length > 0)

      const codigo = buscarCodigoNexa(textos)
      if (codigo) return codigo
    }

    return null
  } catch {
    return null
  }
}

/** Un token "parece código de documento": guiones + alfanumérico en mayúsculas, razonablemente largo. */
function pareceCodigo(texto: string): boolean {
  return /-/.test(texto) && /^[A-Z0-9\-.\/]{8,}$/.test(texto) && /[A-Z]/.test(texto) && /\d/.test(texto)
}

function buscarCodigoNexa(textos: string[]): string | null {
  for (let i = 0; i < textos.length; i++) {
    if (/NEXA/i.test(textos[i])) {
      // El código puede estar pegado en la misma celda ("Nº. NEXA: PN-...") o
      // en el párrafo/celda siguiente.
      const mismaCelda = textos[i].replace(/.*NEXA\s*:?\s*/i, '').trim()
      if (mismaCelda && pareceCodigo(mismaCelda)) return mismaCelda

      const siguiente = textos[i + 1]?.trim()
      if (siguiente && pareceCodigo(siguiente)) return siguiente
    }
  }
  return null
}
