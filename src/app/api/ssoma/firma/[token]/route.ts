import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — obtener datos del personal por token (público, sin auth)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const personal = await prisma.ssomaPersonalHabilitado.findUnique({
      where: { tokenDifusion: token },
      include: {
        user: { select: { id: true, name: true } },
        expediente: {
          select: {
            id: true,
            codigoCod: true,
            proyecto: {
              select: { nombre: true, cliente: { select: { nombre: true } } },
            },
            documentos: {
              where: {
                estado: { in: ['aprobado_interno', 'enviado_cliente', 'aprobado_cliente'] },
              },
              select: {
                id: true,
                codigoDocumento: true,
                titulo: true,
                tipo: true,
                parSubtipo: true,
                driveUrl: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    if (!personal) {
      return NextResponse.json({ error: 'Token no v\u00e1lido' }, { status: 404 })
    }

    return NextResponse.json({
      id: personal.id,
      nombre: personal.user.name,
      cargo: personal.cargo,
      firmaDifusion: personal.firmaDifusion,
      fechaFirma: personal.fechaFirma,
      proyecto: personal.expediente.proyecto.nombre,
      cliente: personal.expediente.proyecto.cliente.nombre,
      codigoCod: personal.expediente.codigoCod,
      documentos: personal.expediente.documentos,
    })
  } catch (error) {
    console.error('GET /api/ssoma/firma/[token]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — registrar firma de difusión (público, sin auth)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const personal = await prisma.ssomaPersonalHabilitado.findUnique({
      where: { tokenDifusion: token },
    })

    if (!personal) {
      return NextResponse.json({ error: 'Token no v\u00e1lido' }, { status: 404 })
    }

    if (personal.firmaDifusion) {
      return NextResponse.json({ error: 'Ya se registr\u00f3 la firma', fechaFirma: personal.fechaFirma }, { status: 409 })
    }

    const updated = await prisma.ssomaPersonalHabilitado.update({
      where: { id: personal.id },
      data: {
        firmaDifusion: true,
        fechaFirma: new Date(),
      },
    })

    return NextResponse.json({ ok: true, fechaFirma: updated.fechaFirma })
  } catch (error) {
    console.error('POST /api/ssoma/firma/[token]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
