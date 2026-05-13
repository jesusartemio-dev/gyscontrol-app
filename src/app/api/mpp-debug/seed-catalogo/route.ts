import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { seedMppEppCatalogo } from '@/lib/mpp/seed'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const result = await seedMppEppCatalogo()
  return NextResponse.json({ ok: true, ...result })
}
