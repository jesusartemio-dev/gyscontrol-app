import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const proyectos = await prisma.proyecto.findMany({
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
        equipos: true,
        servicios: true,
        gastos: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(proyectos)
  } catch (error) {
    console.error('❌ Error en GET /api/proyecto:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyectos' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const data = await req.json()

    // Validaciones básicas
    if (!data.clienteId || !data.comercialId || !data.gestorId || !data.nombre) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      )
    }

    // Generar código del proyecto
    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId },
      select: { codigo: true, numeroSecuencia: true }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    const nuevoNumero = (cliente.numeroSecuencia || 0) + 1
    const codigoProyecto = `${cliente.codigo}-${String(nuevoNumero).padStart(3, '0')}`

    // Crear proyecto
    const nuevoProyecto = await prisma.proyecto.create({
      data: {
        ...data,
        codigo: codigoProyecto,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
      },
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
      }
    })

    // Actualizar el número de secuencia del cliente
    await prisma.cliente.update({
      where: { id: data.clienteId },
      data: { numeroSecuencia: nuevoNumero }
    })

    // ✅ Auditoría removida temporalmente por refactorización

    return NextResponse.json(nuevoProyecto, { status: 201 })
  } catch (error) {
    console.error('❌ Error en POST /api/proyecto:', error)
    return NextResponse.json(
      { error: 'Error al crear proyecto' },
      { status: 500 }
    )
  }
}
