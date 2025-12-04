import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = createActividadSchema.parse(body)

    // ✅ Verificar que EDT existe y pertenece al proyecto
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: validatedData.proyectoEdtId,
        proyectoId: params.id
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
    const actividad = await prisma.proyectoActividad.create({
      data: actividadData,
      include: {
        proyecto_edt: true,
        proyecto_tarea: true // ✅ Corregido: es 'proyecto_tarea' según Prisma
      }
    })

    return NextResponse.json(actividad)
  } catch (error) {
    console.error('Error creando actividad:', error)
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
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const edtId = searchParams.get('edtId')
    const cronogramaId = searchParams.get('cronogramaId')

    const actividades = await prisma.proyectoActividad.findMany({
      where: {
        // ✅ Filtrar por proyecto a través de la relación EDT
        proyecto_edt: {
          proyectoId: id
        },
        ...(edtId && { proyectoEdtId: edtId }),
        ...(cronogramaId && { proyectoCronogramaId: cronogramaId })
      },
      include: {
        proyecto_edt: true, // ✅ EDT padre directo
        proyecto_tarea: true,
        User: true
      },
      orderBy: [
        { proyecto_edt: { orden: 'asc' } },
        { orden: 'asc' }
      ]
    })

    return NextResponse.json(actividades)
  } catch (error) {
    console.error('Error obteniendo actividades:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}