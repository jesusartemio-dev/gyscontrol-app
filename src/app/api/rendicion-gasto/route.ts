import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Generar número correlativo: RND-YYMMDD-XXX
async function generarNumero(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `RND-${yy}${mm}${dd}`

  const ultimo = await prisma.rendicionGasto.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

const includeRelations = {
  solicitudAnticipo: { select: { id: true, numero: true, monto: true, estado: true } },
  proyecto: { select: { id: true, nombre: true, codigo: true } },
  empleado: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  lineas: {
    include: { adjuntos: true, categoriaGasto: true },
    orderBy: { fecha: 'asc' as const },
  },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const solicitudAnticipoId = searchParams.get('solicitudAnticipoId')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (proyectoId) where.proyectoId = proyectoId
    if (solicitudAnticipoId) where.solicitudAnticipoId = solicitudAnticipoId
    if (estado) where.estado = estado

    // Filtrar por permisos
    const role = session.user.role
    if (!['admin', 'gerente'].includes(role)) {
      where.OR = [
        { empleadoId: session.user.id },
        { proyecto: { gestorId: session.user.id } },
        { proyecto: { supervisorId: session.user.id } },
        { proyecto: { liderId: session.user.id } },
      ]
    }

    const data = await prisma.rendicionGasto.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener rendiciones:', error)
    return NextResponse.json({ error: 'Error al obtener rendiciones' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await req.json()

    // Validar proyecto existe
    const proyecto = await prisma.proyecto.findUnique({ where: { id: payload.proyectoId } })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Si vincula anticipo, validar que existe y está pagado
    if (payload.solicitudAnticipoId) {
      const anticipo = await prisma.solicitudAnticipo.findUnique({
        where: { id: payload.solicitudAnticipoId },
      })
      if (!anticipo) {
        return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })
      }
      if (!['pagado', 'liquidado'].includes(anticipo.estado)) {
        return NextResponse.json({ error: 'Solo se puede rendir contra un anticipo pagado' }, { status: 400 })
      }
    }

    const numero = await generarNumero()

    const data = await prisma.rendicionGasto.create({
      data: {
        numero,
        solicitudAnticipoId: payload.solicitudAnticipoId || null,
        proyectoId: payload.proyectoId,
        empleadoId: payload.empleadoId || session.user.id,
        observaciones: payload.observaciones || null,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al crear rendición:', error)
    return NextResponse.json({ error: 'Error al crear rendición' }, { status: 500 })
  }
}
