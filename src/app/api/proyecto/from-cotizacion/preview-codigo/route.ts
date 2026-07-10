// ===================================================
// 📁 Archivo: preview-codigo/route.ts
// 📌 Previsualiza (sin persistir nada) el código que tendría el próximo
//    proyecto de un cliente, y advierte si el cliente todavía tiene un
//    código automático (CLI-XXXX-YY) sin personalizar.
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esCodigoClienteAutomatico, generarCodigoProyectoDesdeCliente } from '@/lib/utils/clienteCodeGenerator'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clienteId = searchParams.get('clienteId')

  if (!clienteId) {
    return NextResponse.json({ error: 'clienteId es requerido' }, { status: 400 })
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { codigo: true, numeroSecuencia: true, nombre: true },
  })

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const esAutomatico = esCodigoClienteAutomatico(cliente.codigo)

  return NextResponse.json({
    clienteNombre: cliente.nombre,
    clienteCodigo: cliente.codigo,
    esAutomatico,
    codigoGenerado: esAutomatico ? null : generarCodigoProyectoDesdeCliente(cliente),
  })
}
