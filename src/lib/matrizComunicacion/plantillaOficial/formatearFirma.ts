/**
 * Iniciales de un nombre completo para el formato de firma "AP: ALONSO PISCOYA".
 * A propósito NO reutiliza generarSiglas (utils.ts): esa función toma un Set de
 * colisión compartido entre TODA la nómina de la matriz — acá cada una de las 4
 * firmas (Desarrolló/Verificó/Aprobó/Autorizó) es posicional e independiente,
 * nunca debe competir por colisión con las otras 3.
 */
export function inicialesDe(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatearFirma(nombre: string | null | undefined): string {
  if (!nombre) return ''
  return `${inicialesDe(nombre)}: ${nombre.toUpperCase()}`
}
