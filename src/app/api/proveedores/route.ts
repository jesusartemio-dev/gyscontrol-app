import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await prisma.proveedor.findMany()
    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('❌ Error al obtener proveedores:', error)
    return NextResponse.json(
      { ok: false, error: 'Error al obtener proveedores: ' + String(error) },
      { status: 500 }
    )
  }
}