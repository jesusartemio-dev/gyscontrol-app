import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 📋 Schema de validación
const createDependenciaSchema = z.object({
  tareaOrigenId: z.string(),
  tareaDependienteId: z.string(),
  tipo: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']),
  lagMinutos: z.number().min(0).default(0)
})

// ✅ GET /api/cotizaciones/[id]/cronograma/dependencias
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotizacionId } = await params
    const session = await getServerSession(authOptions)

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 🔍 Obtener todas las dependencias de la cotización
    const dependencias = await prisma.cotizacionDependenciasTarea.findMany({
      where: {
        tareaOrigenId: {
          in: await prisma.cotizacionTarea.findMany({
            where: {
              cotizacionActividad: {
                cotizacionEdt: { cotizacionId }
              }
            },
            select: { id: true }
          }).then((tasks: any[]) => tasks.map((t: any) => t.id))
        }
      },
      include: {
        tareaOrigen: {
          select: { id: true, nombre: true }
        },
        tareaDependiente: {
          select: { id: true, nombre: true }
        }
      }
    })

    console.log(`📊 DEPENDENCIAS ENCONTRADAS PARA COTIZACIÓN ${cotizacionId}: ${dependencias.length}`)

    // Transformar la respuesta para mantener compatibilidad
    const dependenciasFormateadas = dependencias.map(dep => ({
      ...dep,
      tareaOrigen: dep.tareaOrigen,
      tareaDependiente: dep.tareaDependiente
    }))

    return NextResponse.json({
      success: true,
      data: dependenciasFormateadas
    })

  } catch (error) {
    console.error('❌ Error obteniendo dependencias:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// ✅ POST /api/cotizaciones/[id]/cronograma/dependencias
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotizacionId } = await params
    const session = await getServerSession(authOptions)
    const body = await request.json()

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const validatedData = createDependenciaSchema.parse(body)

    // 🔍 Verificar que ambas tareas existen y pertenecen a la cotización
    const [tareaOrigen, tareaDependiente] = await Promise.all([
      prisma.cotizacionTarea.findFirst({
        where: {
          id: validatedData.tareaOrigenId,
          cotizacionActividad: { cotizacionEdt: { cotizacionId } }
        }
      }),
      prisma.cotizacionTarea.findFirst({
        where: {
          id: validatedData.tareaDependienteId,
          cotizacionActividad: { cotizacionEdt: { cotizacionId } }
        }
      })
    ])

    if (!tareaOrigen || !tareaDependiente) {
      return NextResponse.json({
        error: 'Una o ambas tareas no existen en esta cotización'
      }, { status: 404 })
    }

    // 🚫 Verificar que no se cree un ciclo
    const tieneCiclo = await verificarCiclo(validatedData.tareaDependienteId, validatedData.tareaOrigenId)
    if (tieneCiclo) {
      return NextResponse.json({
        error: 'Esta dependencia crearía un ciclo en las dependencias'
      }, { status: 400 })
    }

    // ✅ Crear dependencia
    const dependencia = await prisma.cotizacionDependenciasTarea.create({
      data: {
        ...validatedData,
        id: `dep-${Date.now()}`,
        updatedAt: new Date()
      },
      include: {
        tareaOrigen: {
          select: { id: true, nombre: true }
        },
        tareaDependiente: {
          select: { id: true, nombre: true }
        }
      }
    })

    // Transformar la respuesta para mantener compatibilidad
    const dependenciaFormateada = {
      ...dependencia,
      tareaOrigen: dependencia.tareaOrigen,
      tareaDependiente: dependencia.tareaDependiente
    }

    return NextResponse.json({
      success: true,
      data: dependenciaFormateada
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error creando dependencia:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}


// 🔄 Función auxiliar para detectar ciclos
async function verificarCiclo(tareaActualId: string, tareaBuscadaId: string): Promise<boolean> {
  // Obtener todas las dependencias donde la tarea actual es origen
  const dependencias = await prisma.cotizacionDependenciasTarea.findMany({
    where: { tareaOrigenId: tareaActualId }
  })

  // Verificar recursivamente
  for (const dep of dependencias) {
    if (dep.tareaDependienteId === tareaBuscadaId) {
      return true
    }

    // Verificar recursivamente en las dependencias de esta tarea
    const tieneCiclo = await verificarCiclo(dep.tareaDependienteId, tareaBuscadaId)
    if (tieneCiclo) return true
  }

  return false
}