import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string }> }

const crmContactoSelect = {
  id: true,
  nombre: true,
  cargo: true,
  email: true,
  telefono: true,
  celular: true,
  esDecisionMaker: true,
} as const

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const contactos = await prisma.proyectoContactoCliente.findMany({
      where: { proyectoId },
      include: { crmContacto: { select: crmContactoSelect } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: contactos })
  } catch (error) {
    console.error('Error listando contactos cliente del proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()
    const { crmContactoId, rolEnProyecto } = body

    if (!crmContactoId || !rolEnProyecto) {
      return NextResponse.json({ error: 'crmContactoId y rolEnProyecto son requeridos' }, { status: 400 })
    }

    const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const contactoCrm = await prisma.crmContactoCliente.findUnique({ where: { id: crmContactoId }, select: { id: true } })
    if (!contactoCrm) return NextResponse.json({ error: 'Contacto CRM no encontrado' }, { status: 404 })

    const nuevo = await prisma.proyectoContactoCliente.create({
      data: { proyectoId, crmContactoId, rolEnProyecto, updatedAt: new Date() },
      include: { crmContacto: { select: crmContactoSelect } },
    })

    return NextResponse.json({ success: true, data: nuevo }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Este contacto ya está asignado a este proyecto' }, { status: 409 })
    }
    console.error('Error asignando contacto cliente:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const { searchParams } = new URL(req.url)
    const contactoId = searchParams.get('contactoId')

    if (!contactoId) return NextResponse.json({ error: 'contactoId es requerido' }, { status: 400 })

    const existente = await prisma.proyectoContactoCliente.findFirst({ where: { id: contactoId, proyectoId } })
    if (!existente) return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })

    await prisma.proyectoContactoCliente.delete({ where: { id: contactoId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removiendo contacto cliente:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
