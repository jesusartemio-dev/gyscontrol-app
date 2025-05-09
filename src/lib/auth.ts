import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Correo', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) return null
    
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
    
        if (!user || !user.password) return null
    
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null
    
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    })
    ,
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Cuando se loguea, `user` está disponible
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      // El token se propaga a la sesión
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
