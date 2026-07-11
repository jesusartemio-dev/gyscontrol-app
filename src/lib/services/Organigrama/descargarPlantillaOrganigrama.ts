import { crearCargadorPlantillaLocal } from '@/lib/documentosOficiales/plantillaOficial/crearCargadorPlantillaLocal'

// Plantilla oficial versionada en el repo — no hay fallback a Google Drive:
// este archivo vive en el repo, no en Drive.
const { cargar, limpiarCache } = crearCargadorPlantillaLocal('src/lib/services/Organigrama/plantilla_organigrama.docx')

export const descargarPlantillaOrganigramaOficial = cargar
export const limpiarCachePlantillaOrganigrama = limpiarCache
