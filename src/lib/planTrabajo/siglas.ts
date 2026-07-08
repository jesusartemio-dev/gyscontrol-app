/**
 * Cálculo y deduplicación de siglas de personal para el Plan de Trabajo.
 * Única fuente de verdad — usada tanto por la IA (post-proceso en generar-ia)
 * como por construirDataBag al exportar, para evitar que dos personas del
 * mismo plan terminen con las mismas iniciales (informe §4.4).
 */

export function calcularSiglasBase(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0]?.toUpperCase() ?? '')
    .slice(0, 3)
    .join('')
}

export interface PersonaConSiglas {
  nombre: string
  siglas?: string
}

/**
 * Normaliza las siglas de una lista de personas y resuelve colisiones dentro
 * del mismo conjunto: primero intenta inicial + 2 letras del segundo nombre/apellido,
 * y si sigue colisionando agrega un sufijo numérico.
 */
export function deduplicarSiglas<T extends PersonaConSiglas>(
  personas: T[]
): (T & { siglas: string })[] {
  const usadas = new Set<string>()

  return personas.map(persona => {
    const base = persona.siglas?.trim() || calcularSiglasBase(persona.nombre)
    let candidata = base

    if (usadas.has(candidata)) {
      const partes = persona.nombre.split(/\s+/).filter(Boolean)
      const segundaParte = partes[1] ?? partes[0] ?? ''
      const alterna = `${base[0] ?? ''}${segundaParte.slice(0, 2).toUpperCase()}`
      if (!usadas.has(alterna)) candidata = alterna
    }

    let final = candidata
    let sufijo = 2
    while (usadas.has(final)) {
      final = `${candidata}${sufijo}`
      sufijo += 1
    }

    usadas.add(final)
    return { ...persona, siglas: final }
  })
}
