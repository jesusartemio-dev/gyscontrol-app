import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UsuariosClient from '@/components/UsuariosClient'
import type { RolUsuario } from '@/types/modelos'

const ALLOWED_ROLES: RolUsuario[] = ['admin']

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)

  if (!session || !ALLOWED_ROLES.includes(session.user.role as RolUsuario)) {
    redirect('/')
  }

  return <UsuariosClient />
}
