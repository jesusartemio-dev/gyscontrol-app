import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [proyectos, centrosCosto, usuarios] = await Promise.all([
      prisma.proyecto.findMany({
        where: { esInterno: true },
        select: {
          id: true, codigo: true, nombre: true, estado: true, centroCostoId: true,
          centroCosto: { select: { id: true, nombre: true, tipo: true } },
          gestor: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.centroCosto.findMany({
        where: { activo: { not: false } },
        select: { id: true, nombre: true, tipo: true },
        orderBy: { nombre: 'asc' }
      }),
      prisma.user.findMany({
        where: { role: { in: ['admin', 'coordinador', 'gestor', 'proyectos'] } },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' }
      }),
    ])

    return NextResponse.json({ ok: true, data: proyectos, centrosCosto, usuarios })
  } catch (error) {
    console.error('Error al obtener proyectos internos:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos internos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!['admin', 'coordinador', 'gestor'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos para crear proyectos internos' }, { status: 403 })
    }

    const body = await req.json()
    const { nombre, centroCostoId, gestorId, fechaInicio } = body

    if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    if (!centroCostoId) return NextResponse.json({ error: 'El Centro de Costos es requerido' }, { status: 400 })
    if (!gestorId) return NextResponse.json({ error: 'El responsable es requerido' }, { status: 400 })

    const cc = await prisma.centroCosto.findUnique({ where: { id: centroCostoId }, select: { nombre: true } })
    if (!cc) return NextResponse.json({ error: 'Centro de Costos no encontrado' }, { status: 404 })

    // Generar código automático: INT-001, INT-002, ...
    const count = await prisma.proyecto.count({ where: { esInterno: true } })
    const codigo = `INT-${String(count + 1).padStart(3, '0')}`

    const proyectoId = randomUUID()

    // Buscar o crear el EDT del catálogo "General" (para proyectos internos)
    const edtCatalogo = await prisma.edt.upsert({
      where: { nombre: 'General' },
      update: {},
      create: { nombre: 'General', updatedAt: new Date() }
    })

    // Crear el proyecto interno en una transacción junto con su cronograma y EDT "General"
    const proyecto = await prisma.$transaction(async (tx) => {
      const p = await tx.proyecto.create({
        data: {
          id: proyectoId,
          codigo,
          nombre: nombre.trim(),
          esInterno: true,
          centroCostoId,
          gestorId,
          fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
          estado: 'en_ejecucion',
          totalEquiposInterno: 0,
          totalServiciosInterno: 0,
          totalGastosInterno: 0,
          totalInterno: 0,
          totalCliente: 0,
          grandTotal: 0,
          updatedAt: new Date(),
        }
      })

      // Auto-crear cronograma de ejecución
      const cronogramaId = randomUUID()
      await tx.proyectoCronograma.create({
        data: {
          id: cronogramaId,
          proyectoId,
          tipo: 'ejecucion',
          nombre: 'Ejecución',
          updatedAt: new Date(),
        }
      })

      // Auto-crear EDT "General" vinculado al catálogo
      await tx.proyectoEdt.create({
        data: {
          id: randomUUID(),
          proyectoId,
          proyectoCronogramaId: cronogramaId,
          edtId: edtCatalogo.id,
          nombre: 'General',
          orden: 1,
          updatedAt: new Date(),
        }
      })

      return p
    })

    const result = await prisma.proyecto.findUnique({
      where: { id: proyecto.id },
      select: {
        id: true, codigo: true, nombre: true, estado: true,
        centroCosto: { select: { id: true, nombre: true } },
        gestor: { select: { id: true, name: true } },
        createdAt: true,
      }
    })

    return NextResponse.json({ ok: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('Error al crear proyecto interno:', error)
    return NextResponse.json({ error: 'Error al crear proyecto interno' }, { status: 500 })
  }
}
