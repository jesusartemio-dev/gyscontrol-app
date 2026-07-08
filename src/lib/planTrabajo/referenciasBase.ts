import type { PlanReferencia } from '@/types/planTrabajo'

/**
 * Normativa peruana SSOMA estándar — aplica a todos los proyectos, independiente
 * del contexto. Antes vivía hardcodeada dentro del prompt de IA (menos mantenible
 * y sujeta a que el modelo la omita u olvide); ahora es texto fijo de código que
 * construirDataBag concatena siempre al array `referencias` (informe §4.5/§7).
 */
export const REFERENCIAS_BASE: PlanReferencia[] = [
  {
    codigoDocumento: 'Ley N° 29783',
    titulo: 'Ley de Seguridad y Salud en el Trabajo',
    origen: 'NORMATIVA',
  },
  {
    codigoDocumento: 'DS-005-2012-TR',
    titulo: 'Reglamento de la Ley N° 29783, Ley de Seguridad y Salud en el Trabajo',
    origen: 'NORMATIVA',
  },
  {
    codigoDocumento: 'RM 050-2013-TR',
    titulo: 'Formatos referenciales del Sistema de Gestión de Seguridad y Salud en el Trabajo',
    origen: 'NORMATIVA',
  },
]
