import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    const where = userId ? { userId } : {}

    const data = await prisma.empleado.findMany({
      where,
      include: {
        cargo: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          }
        },
        recursoComposiciones: {
          include: {
            recurso: {
              select: {
                id: true,
                nombre: true,
                tipo: true,
                costoHora: true,
              }
            }
          }
        }
      },
      orderBy: [
        { activo: 'desc' },
        { user: { name: 'asc' } }
      ]
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /empleado:', error)
    return NextResponse.json({ error: 'Error al listar empleados' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Verificar si ya existe un empleado para este usuario
    const existente = await prisma.empleado.findUnique({
      where: { userId: body.userId }
    })

    if (existente) {
      return NextResponse.json(
        { message: 'Ya existe un registro de empleado para este usuario' },
        { status: 400 }
      )
    }

    const data = await prisma.empleado.create({
      data: {
        userId: body.userId,
        cargoId: body.cargoId || null,
        sueldoPlanilla: body.sueldoPlanilla ? parseFloat(body.sueldoPlanilla) : null,
        sueldoHonorarios: body.sueldoHonorarios ? parseFloat(body.sueldoHonorarios) : null,
        fechaIngreso: body.fechaIngreso ? new Date(body.fechaIngreso) : null,
        fechaCese: body.fechaCese ? new Date(body.fechaCese) : null,
        activo: body.activo ?? true,
        documentoIdentidad: body.documentoIdentidad,
        telefono: body.telefono,
        direccion: body.direccion,
        contactoEmergencia: body.contactoEmergencia,
        telefonoEmergencia: body.telefonoEmergencia,
        observaciones: body.observaciones,
      },
      include: {
        cargo: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /empleado:', error)
    return NextResponse.json({ error: 'Error al crear empleado' }, { status: 500 })
  }
}
