import { tieneRol } from '@/lib/auth/roles'
import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PersonalClient from '@/components/PersonalClient'
import type { RolUsuario } from '@/types/modelos'

const ALLOWED_ROLES: RolUsuario[] = ['admin', 'gerente']

export default async function PersonalPage() {
  const session = await getServerSession(authOptions)

  if (!session || !tieneRol(session, ALLOWED_ROLES)) {
    redirect('/')
  }

  return <PersonalClient />
}
