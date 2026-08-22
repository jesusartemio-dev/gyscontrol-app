import NextAuth from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      /** Rol principal. Para permisos usa `roles` / tieneRol(), no este campo. */
      role: string
      /** Roles adicionales al principal. */
      rolesExtra: string[]
      /** Roles efectivos = role + rolesExtra, sin duplicados. */
      roles: string[]
      sectionAccess: string[]
      name?: string
      email?: string
      image?: string
    }
  }

  interface User {
    id: string
    role: string
    rolesExtra?: string[]
    name?: string
    email?: string
    image?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    rolesExtra: string[]
    roles: string[]
    sectionAccess: string[]
  }
}
