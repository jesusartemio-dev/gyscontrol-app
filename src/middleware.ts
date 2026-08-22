import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { ROUTE_TO_SECTION, DEFAULT_ROLE_SECTIONS, RUTAS_MULTISECCION, type RoleKey } from '@/lib/config/sections'

// Mapeo de prefijos de ruta a sectionKey (ordenado por longitud descendente para match correcto)
const ROUTE_PREFIXES = Object.entries(ROUTE_TO_SECTION)
  .sort((a, b) => b[0].length - a[0].length)

const protectedRoutes = withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Rutas públicas
    if (path.startsWith('/login') || path.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    // Verificar autenticación
    if (!token?.sub) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const role = token.role as string | undefined
    // Multi-rol: los permisos son la unión de `role` + `rolesExtra`.
    // Tokens emitidos antes del despliegue no traen `roles`; se cae al principal.
    const roles = (token.roles as string[] | undefined)?.length
      ? (token.roles as string[])
      : [role || 'colaborador']

    // Obtener sectionAccess del token (inyectado en auth.ts)
    const sectionAccess = token.sectionAccess as string[] | undefined

    // Páginas con restricción de rol específica (más granular que secciones)
    if (path.startsWith('/admin/uso-ia') && !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    // Secciones efectivas del usuario (BD si existe, si no la unión de los
    // defaults de cada rol)
    const seccionesUsuario = sectionAccess && sectionAccess.length > 0
      ? sectionAccess
      : Array.from(new Set(roles.flatMap(r => DEFAULT_ROLE_SECTIONS[r as RoleKey] || [])))

    // Rutas compartidas entre secciones (ej. Órdenes de Compra: la usan
    // Logística y Administración). Se evalúan primero porque son más
    // específicas que el prefijo general de la sección.
    const rutaCompartida = RUTAS_MULTISECCION.find(r => path.startsWith(r.prefix))
    if (rutaCompartida) {
      if (!rutaCompartida.sections.some(s => seccionesUsuario.includes(s))) {
        return NextResponse.redirect(new URL('/denied', req.url))
      }
      return NextResponse.next()
    }

    // Verificar acceso a sección por ruta. `seccionesUsuario` ya resuelve
    // BD-vs-fallback y la unión de roles, así que basta con consultarlo.
    for (const [prefix, sectionKey] of ROUTE_PREFIXES) {
      if (path.startsWith(prefix)) {
        if (!seccionesUsuario.includes(sectionKey)) {
          return NextResponse.redirect(new URL('/denied', req.url))
        }
        break
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export default protectedRoutes

export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
}
