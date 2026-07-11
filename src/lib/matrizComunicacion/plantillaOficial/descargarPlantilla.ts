import { crearCargadorPlantillaLocal } from '@/lib/documentosOficiales/plantillaOficial/crearCargadorPlantillaLocal'

// Plantilla oficial versionada en el repo — a diferencia de plan-trabajo, no
// hay fallback a Google Drive: este archivo vive en el repo, no en Drive.
const { cargar, limpiarCache } = crearCargadorPlantillaLocal('src/lib/services/Matriz/plantilla_matriz_comunicacion.docx')

export const descargarPlantillaMatrizOficial = cargar
export const limpiarCachePlantillaMatriz = limpiarCache
