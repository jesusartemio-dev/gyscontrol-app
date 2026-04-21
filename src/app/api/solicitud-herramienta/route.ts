import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_LOGISTICA = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

async function generarNumeroSolicitud(client: any = prisma): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `SOL-${yy}${mm}${dd}`

  const ultima = await client.solicitudHerramienta.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultima) {
    const parts = ultima.numero.split('-')
    const num = parseInt(parts[parts.length - 1])
    if (Number.isFinite(num)) correlativo = num + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const mias = searchParams.get('mias') === 'true'
  const incluirCanceladas = searchParams.get('incluirCanceladas') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const esLogistica = ROLES_LOGISTICA.includes(session.user.role)
  const vistaTrabajador = !esLogistica || mias

  const where: any = {}
  if (estado) {
    where.estado = estado
  } else if (vistaTrabajador && !incluirCanceladas) {
    // En la vista del trabajador, por defecto se ocultan las canceladas.
    where.estado = { not: 'cancelada' }
  } else if (!vistaTrabajador) {
    // Logística nunca ve borradores de otros usuarios.
    where.estado = { not: 'borrador' }
  }

  if (vistaTrabajador) {
    where.solicitanteId = session.user.id
  }

  const solicitudes = await prisma.solicitudHerramienta.findMany({
    where,
    include: {
      solicitante: { select: { id: true, name: true, email: true } },
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      atendidaPor: { select: { id: true, name: true, email: true } },
      prestamo: { select: { id: true, fechaPrestamo: true, estado: true } },
      items: {
        include: {
          catalogoHerramienta: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              unidadMedida: true,
              stock: { select: { cantidadDisponible: true } },
            },
          },
        },
      },
    },
    orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return NextResponse.json({ solicitudes })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { proyectoId, observaciones, items } = body

    // Items son opcionales al crear: el borrador se puede crear vacío y luego ir llenando.
    if (items && !Array.isArray(items)) {
      return NextResponse.json({ error: 'items debe ser un array' }, { status: 400 })
    }
    if (items) {
      for (const it of items) {
        if (!it?.catalogoHerramientaId) {
          return NextResponse.json({ error: 'Cada ítem debe tener catalogoHerramientaId' }, { status: 400 })
        }
        if (!Number.isFinite(it.cantidad) || it.cantidad <= 0) {
          return NextResponse.json({ error: 'Cada ítem debe tener cantidad > 0' }, { status: 400 })
        }
      }
    }

    const solicitud = await prisma.$transaction(async (tx) => {
      const numero = await generarNumeroSolicitud(tx)
      return tx.solicitudHerramienta.create({
        data: {
          numero,
          solicitanteId: session.user.id,
          proyectoId: proyectoId || null,
          observaciones: observaciones || null,
          // El estado default es 'borrador' (definido en el schema).
          items: items?.length
            ? {
                create: items.map((it: any) => ({
                  catalogoHerramientaId: it.catalogoHerramientaId,
                  cantidad: it.cantidad,
                })),
              }
            : undefined,
        },
        include: {
          solicitante: { select: { id: true, name: true, email: true } },
          items: {
            include: { catalogoHerramienta: { select: { codigo: true, nombre: true } } },
          },
        },
      })
    })

    return NextResponse.json(solicitud, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear solicitud de herramienta:', error)
    return NextResponse.json({ error: error.message || 'Error al crear solicitud' }, { status: 500 })
  }
}
