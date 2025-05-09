// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const protectedRoutes = withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string
    const path = req.nextUrl.pathname

    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/comercial') && !['admin', 'comercial'].includes(role)) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/proyectos') && !['admin', 'proyectos'].includes(role)) {
      return NextResponse.redirect(new URL('/denied', req.url))
    }

    if (path.startsWith('/logistica') && !['admin', 'logistica'].includes(role)) {
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
  matcher: ['/((?!login|api|_next|favicon.ico).*)'],
}
