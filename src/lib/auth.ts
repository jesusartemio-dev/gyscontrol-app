import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { AuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import * as bcrypt from 'bcryptjs'
import { getSectionAccessForRole, getSectionAccessForRoles } from './services/section-access'
import { combinarRoles } from './auth/roles'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user || !user.password) {
            return null
          }

          // Intentar comparar con bcrypt primero
          let isValid = false
          try {
            isValid = await bcrypt.compare(credentials.password, user.password)
          } catch (error) {
            // Si falla bcrypt, intentar comparación directa (para usuarios de prueba)
            isValid = credentials.password === user.password
          }

          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            name: user.name ?? undefined,
            email: user.email,
            role: user.role,
            rolesExtra: user.rolesExtra ?? [],
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Para Google OAuth, permitir siempre (auto-crea usuario con rol default)
      if (account?.provider === 'google') {
        return true
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        let role = (user as any).role
        let rolesExtra = (user as any).rolesExtra as string[] | undefined
        // OAuth users no traen role del provider — buscar en DB.
        // rolesExtra tampoco viaja por el provider, así que se lee siempre
        // que no venga del authorize() de credentials.
        if (!role || !rolesExtra) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, rolesExtra: true }
          })
          role = role || dbUser?.role || 'colaborador'
          rolesExtra = rolesExtra ?? dbUser?.rolesExtra ?? []
        }
        token.role = role
        token.rolesExtra = rolesExtra
        token.roles = combinarRoles(role, rolesExtra)
        token.sectionAccess = await getSectionAccessForRoles(token.roles)
      }
      if (trigger === 'update') {
        // Releer de BD: el admin pudo cambiar rol o rolesExtra.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, rolesExtra: true }
        })
        if (dbUser) {
          token.role = dbUser.role
          token.rolesExtra = dbUser.rolesExtra
        }
        token.roles = combinarRoles(token.role as string, token.rolesExtra as string[])
        token.sectionAccess = await getSectionAccessForRoles(token.roles)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any
        u.id = token.id as string
        u.role = token.role as string
        u.rolesExtra = token.rolesExtra || []
        u.roles = token.roles || [token.role as string]
        u.sectionAccess = token.sectionAccess || []
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
          },
        })
      } catch (error) {
        console.error('[Auth Event] Error updating lastLoginAt:', error)
      }
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  // Get full user data from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    }
  })

  return user
}
