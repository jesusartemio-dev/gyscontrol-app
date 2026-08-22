/**
 * Roles globales (enum Role / session.user.role) habilitados para el módulo de
 * Evidencias Técnicas / de Avance (área de proyectos).
 *
 * Centralizado aquí para que servicios y rutas NO redeclaren las listas en cada
 * archivo (a diferencia del módulo de seguridad, que las repite por archivo).
 *
 * Nota sobre la lista candidata ['admin','gerente','gestor','lider','ingeniero','tecnico']:
 * 'lider', 'ingeniero' y 'tecnico' NO existen en el enum Role de prisma/schema.prisma,
 * así que se descartaron. El personal de proyectos que captura evidencia en campo se
 * representa con los roles `proyectos` y `coordinador` (que sí existen en el enum).
 *
 * Tres niveles:
 *   - ROLES_LECTURA: solo consultan. Es ROLES_PERMITIDOS más `seguridad`, que
 *     necesita ver el avance técnico para contrastarlo con sus evidencias SSOMA
 *     pero no captura evidencia de montaje/conexionado/pruebas.
 *   - ROLES_PERMITIDOS: pueden leer y capturar evidencia. Incluye a `proyectos` y
 *     `coordinador` (personal de campo), que NO bypassan los locks: solo pueden
 *     escribir si la jornada está activa Y la evidencia está abierta.
 *   - ROLES_BYPASS (admin/gerente/gestor): edición total, bypassan los locks.
 *
 * Los handlers GET usan ROLES_LECTURA; los de escritura, ROLES_PERMITIDOS.
 */

/** Roles que pueden leer y capturar evidencia técnica. */
export const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'proyectos', 'coordinador'] as const

/** Roles que pueden consultar evidencia técnica (superset de ROLES_PERMITIDOS). */
export const ROLES_LECTURA = [...ROLES_PERMITIDOS, 'seguridad'] as const

/** Roles con edición total: bypassan los locks (jornada/evidencia cerrada). */
export const ROLES_BYPASS = ['admin', 'gerente', 'gestor'] as const

export type RolEvidenciaProyecto = (typeof ROLES_PERMITIDOS)[number]
