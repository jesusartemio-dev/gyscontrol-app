import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { RolUsuario } from '@/types/modelos'

const protectedRoutes = withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as RolUsuario | undefined
    const path = req.nextUrl.pathname

    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/comercial') && !['admin', 'gerente', 'comercial', 'presupuestos'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/crm') && !['admin', 'gerente', 'comercial', 'presupuestos'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/proyectos') && !['admin', 'gerente', 'proyectos', 'coordinador', 'gestor'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/logistica') && !['admin', 'gerente', 'logistico'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/gestion') && !['admin', 'gerente', 'gestor'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/finanzas') && !['admin', 'gerente', 'finanzas', 'gestor'].includes(role || '')) {
      return NextResponse.redirect(new URL('/denied', req.url))
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
