import { NextResponse } from 'next/server'

// Este endpoint fue reemplazado por el campo registroContador en PUT /api/administracion/cuentas-pagar/[id]
export async function POST() {
  return NextResponse.json({ error: 'Endpoint obsoleto' }, { status: 410 })
}
export async function DELETE() {
  return NextResponse.json({ error: 'Endpoint obsoleto' }, { status: 410 })
}
