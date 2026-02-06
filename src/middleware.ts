import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { ROUTE_TO_SECTION, DEFAULT_ROLE_SECTIONS, type RoleKey } from '@/lib/config/sections'

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

    // Obtener sectionAccess del token (inyectado en auth.ts)
    const sectionAccess = token.sectionAccess as string[] | undefined

    // Verificar acceso a sección por ruta
    for (const [prefix, sectionKey] of ROUTE_PREFIXES) {
      if (path.startsWith(prefix)) {
        if (sectionAccess && sectionAccess.length > 0) {
          // Usar sectionAccess del token (desde BD)
          if (!sectionAccess.includes(sectionKey)) {
            return NextResponse.redirect(new URL('/denied', req.url))
          }
        } else {
          // Fallback: usar config por defecto si no hay sectionAccess en token
          const defaultSections = DEFAULT_ROLE_SECTIONS[(role || 'colaborador') as RoleKey] || []
          if (!defaultSections.includes(sectionKey)) {
            return NextResponse.redirect(new URL('/denied', req.url))
          }
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
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
}
