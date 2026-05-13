import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, _ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function POST(_req: NextRequest, _ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function PATCH(_req: NextRequest, _ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
