import { tieneRol } from '@/lib/auth/roles'
import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function SeguridadLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = session.user.role
  if (!tieneRol(session, ['admin', 'gerente', 'gestor', 'seguridad'])) {
    redirect('/')
  }

  return <>{children}</>
}
