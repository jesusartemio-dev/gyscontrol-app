import { readFile } from 'fs/promises'
import path from 'path'
import { crearCargadorPlantillaLocal } from '@/lib/documentosOficiales/plantillaOficial/crearCargadorPlantillaLocal'

// Plantilla oficial versionada en el repo — no hay fallback a Google Drive:
// este archivo vive en el repo, no en Drive.
// La ruta literal + el readFile deben vivir en ESTE archivo (no dentro de la
// fábrica genérica) para que el file-tracing de Vercel detecte e incluya el
// .docx en el bundle desplegado — ver comentario en crearCargadorPlantillaLocal.
const TEMPLATE_LOCAL_PATH = path.join(process.cwd(), 'src/lib/services/Organigrama/plantilla_organigrama.docx')

const { cargar, limpiarCache } = crearCargadorPlantillaLocal(() => readFile(TEMPLATE_LOCAL_PATH))

export const descargarPlantillaOrganigramaOficial = cargar
export const limpiarCachePlantillaOrganigrama = limpiarCache
