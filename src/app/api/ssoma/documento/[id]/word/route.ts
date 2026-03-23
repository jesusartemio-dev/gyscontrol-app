import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generarDocxPlanEmergencia } from '@/lib/ssoma/exportDocx'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    const doc = await prisma.ssomaDocumento.findUnique({
      where: { id },
      include: {
        expediente: {
          include: { proyecto: { include: { cliente: true } } },
        },
      },
    })
    if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (doc.tipo !== 'PLAN_EMERGENCIA') return NextResponse.json({ error: 'No es Plan de Emergencia' }, { status: 400 })
    if (!doc.contenidoTexto) return NextResponse.json({ error: 'Sin contenido' }, { status: 400 })

    // Parse JSON from AI content
    let contenidoIA: any
    try {
      let clean = doc.contenidoTexto.trim()
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
      const jsonStart = clean.indexOf('{')
      const jsonEnd = clean.lastIndexOf('}')
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        clean = clean.substring(jsonStart, jsonEnd + 1)
      }
      contenidoIA = JSON.parse(clean)
    } catch {
      return NextResponse.json(
        { error: 'El contenido no es JSON válido. Regenera el Plan de Emergencias primero.' },
        { status: 422 }
      )
    }

    const exp = doc.expediente

    // Obtener contactos del cliente
    const contactosCliente = await prisma.crmContactoCliente.findMany({
      where: { clienteId: exp.proyecto.clienteId ?? undefined },
      select: { nombre: true, cargo: true, telefono: true, email: true },
      take: 6,
    })

    const blob = await generarDocxPlanEmergencia({
      codigo: doc.codigoDocumento,
      revision: doc.revision,
      fecha: new Date().toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }),
      proyecto: exp.proyecto.nombre,
      cliente: exp.proyecto.cliente?.nombre ?? '',
      planta: exp.proyecto.descripcion ?? exp.proyecto.cliente?.nombre ?? '',
      ingSeguridad: exp.ingSeguridad ?? '',
      gestorNombre: exp.gestorNombre ?? '',
      ggNombre: exp.ggNombre ?? '',
      contactosCliente: contactosCliente.map(c => ({
        nombre: c.nombre ?? '',
        cargo: c.cargo ?? '',
        telefono: c.telefono ?? '',
        correo: c.email ?? '',
      })),
      contenidoIA,
    })

    const buffer = Buffer.from(await blob.arrayBuffer())
    const filename = `${doc.codigoDocumento}.docx`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Word PRE error:', error)
    return NextResponse.json({ error: 'Error generando documento' }, { status: 500 })
  }
}
