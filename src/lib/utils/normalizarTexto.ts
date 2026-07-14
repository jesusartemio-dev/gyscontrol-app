/**
 * trim + minúsculas + sin tildes — comparación de texto insensible a mayúsculas
 * y acentos ("Tubería" === "tuberia"). Puro, sin dependencias — usado tanto en
 * el matching de sugerencias del catálogo de imágenes (plan de trabajo) como
 * en la deduplicación de firmantes de la carátula (construirDataBag.ts).
 */
export function normalizarTexto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}
