/**
 * Multi-rol: helpers para leer los roles efectivos de una sesión.
 *
 * Modelo: `User.role` es el rol principal (el que se muestra en la UI y el que
 * usan los reportes) y `User.rolesExtra` son roles adicionales. Los permisos
 * son la UNIÓN de ambos: si CUALQUIERA de los roles del usuario está en la
 * lista permitida, pasa.
 *
 * Con `rolesExtra` vacío el comportamiento es idéntico al de un solo rol, así
 * que estos helpers se pueden adoptar de forma incremental sin cambiar nada.
 *
 * Uso en API routes — reemplaza el patrón viejo:
 *
 *   if (!ROLES_PERMITIDOS.includes(session.user.role))   // ❌ solo el principal
 *   if (!tieneRol(session, ROLES_PERMITIDOS))            // ✅ unión de roles
 *
 * OJO con la semántica: estos helpers responden "¿tiene este permiso?", no
 * "¿es exactamente este rol?". Para lógica que ESTRECHA datos (p. ej. "los
 * comerciales solo ven su propia cartera") no uses `tieneRol` a la inversa;
 * decide explícitamente qué pasa cuando alguien tiene ambos roles.
 */

/** Forma mínima que necesitan los helpers: sirve una Session o un JWT. */
export interface ConRoles {
  role?: string | null
  rolesExtra?: string[] | null
  roles?: string[] | null
}

type FuenteRoles = ConRoles | { user?: ConRoles | null } | null | undefined

function extraer(fuente: FuenteRoles): ConRoles | null {
  if (!fuente) return null
  if ('user' in fuente && fuente.user) return fuente.user as ConRoles
  return fuente as ConRoles
}

/**
 * Roles efectivos de un usuario: el principal más los extra, sin duplicados.
 * Acepta una Session (`{ user: {...} }`), el objeto user suelto, o un JWT.
 */
export function rolesDe(fuente: FuenteRoles): string[] {
  const u = extraer(fuente)
  if (!u) return []
  // `roles` ya viene precalculado en el token/sesión; si está, es la fuente.
  if (u.roles && u.roles.length > 0) return u.roles
  const lista = [u.role, ...(u.rolesExtra ?? [])].filter(
    (r): r is string => typeof r === 'string' && r.length > 0,
  )
  return Array.from(new Set(lista))
}

/** true si el usuario tiene AL MENOS UNO de los roles permitidos. */
export function tieneRol(fuente: FuenteRoles, permitidos: readonly string[]): boolean {
  const roles = rolesDe(fuente)
  return roles.some((r) => permitidos.includes(r))
}

/** true si el usuario tiene TODOS los roles indicados. Poco común. */
export function tieneTodosLosRoles(fuente: FuenteRoles, requeridos: readonly string[]): boolean {
  const roles = rolesDe(fuente)
  return requeridos.every((r) => roles.includes(r))
}

/**
 * Combina el rol principal con los extra. Para usar donde ya tienes los campos
 * sueltos (p. ej. leyendo de Prisma) y no una sesión.
 */
export function combinarRoles(role: string | null | undefined, rolesExtra: readonly string[] | null | undefined): string[] {
  const lista = [role, ...(rolesExtra ?? [])].filter(
    (r): r is string => typeof r === 'string' && r.length > 0,
  )
  return Array.from(new Set(lista))
}
