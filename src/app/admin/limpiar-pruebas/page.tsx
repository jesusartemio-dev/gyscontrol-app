import { tieneRol } from '@/lib/auth/roles'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LimpiarPruebasClient from './LimpiarPruebasClient'

export default async function LimpiarPruebasPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !tieneRol(session, ['admin'])) {
    redirect('/dashboard')
  }

  return <LimpiarPruebasClient />
}
