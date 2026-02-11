import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createActividadSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  fechaInicioPlan: z.string().datetime().optional(),
  fechaFinPlan: z.string().datetime().optional(),
  horasEstimadas: z.number().positive().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  proyectoEdtId: z.string().min(1, 'EDT requerido'), // ✅ OBLIGATORIO - Sin zonaId
  orden: z.number().default(0)
})

type CreateActividadData = z.infer<typeof createActividadSchema> & {
  fechaInicioPlan?: Date
  fechaFinPlan?: Date
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = createActividadSchema.parse(body)

    // ✅ Verificar que EDT existe y pertenece al proyecto
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: validatedData.proyectoEdtId,
        proyectoId: id
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Preparar datos para creación
    const actividadData: any = {
      nombre: validatedData.nombre,
      descripcion: validatedData.descripcion,
      prioridad: validatedData.prioridad,
      proyectoEdtId: validatedData.proyectoEdtId,
      proyectoCronogramaId: edt.proyectoCronogramaId, // ✅ Heredar cronograma del EDT
      orden: validatedData.orden
    }

    // ✅ Agregar fechas solo si están presentes
    if (validatedData.fechaInicioPlan) {
      actividadData.fechaInicioPlan = new Date(validatedData.fechaInicioPlan)
    }
    if (validatedData.fechaFinPlan) {
      actividadData.fechaFinPlan = new Date(validatedData.fechaFinPlan)
    }
    if (validatedData.horasEstimadas) {
      actividadData.horasPlan = validatedData.horasEstimadas
    }

    // ✅ Crear actividad directamente bajo EDT (sin zona)
    actividadData.updatedAt = new Date()
    const actividad = await prisma.proyectoActividad.create({
      data: actividadData,
      include: {
        proyectoEdt: true,
        proyectoTarea: true // ✅ Corregido: es 'proyectoTarea' según Prisma
      }
    })

    return NextResponse.json(actividad)
  } catch (error) {
    logger.error('Error creando actividad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const edtId = searchParams.get('edtId')
    const cronogramaId = searchParams.get('cronogramaId')

    const actividades = await prisma.proyectoActividad.findMany({
      where: {
        // ✅ Filtrar por proyecto a través de la relación EDT
        proyectoEdt: {
          proyectoId: id
        },
        ...(edtId && { proyectoEdtId: edtId }),
        ...(cronogramaId && { proyectoCronogramaId: cronogramaId })
      },
      include: {
        proyectoEdt: true, // ✅ EDT padre directo
        proyectoTarea: true,
        user: true
      },
      orderBy: [
        { proyectoEdt: { orden: 'asc' } },
        { orden: 'asc' }
      ]
    })

    return NextResponse.json(actividades)
  } catch (error) {
    logger.error('Error obteniendo actividades:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}