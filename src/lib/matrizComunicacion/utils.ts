export function generarSiglas(nombre: string, usadas: Set<string>): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  const base = partes.map(p => p[0].toUpperCase()).join('')
  if (!usadas.has(base)) return base
  if (partes.length >= 2) {
    const alt = partes[0][0].toUpperCase() + partes[1].substring(0, 2).toUpperCase()
    if (!usadas.has(alt)) return alt
  }
  let i = 2
  while (usadas.has(`${base}${i}`)) i++
  return `${base}${i}`
}
