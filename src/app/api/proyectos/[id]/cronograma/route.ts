// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/route.ts
// 🔧 Descripción: API para gestión de cronogramas de proyecto
// 🎯 Funcionalidades: CRUD de tipos de cronograma
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// ✅ Schema de validación para crear cronograma
const createCronogramaSchema = z.object({
  tipo: z.enum(['comercial', 'planificacion', 'ejecucion']),
  nombre: z.string().optional(), // Nombre automático según tipo
  copiadoDesdeCotizacionId: z.string().optional(),
  copiarDesdeId: z.string().optional(), // ID de cronograma origen para copiar
  esBaseline: z.boolean().optional().default(false),
})

// ✅ Nombres automáticos por tipo
const NOMBRES_CRONOGRAMA: Record<string, string> = {
  comercial: 'Comercial',
  planificacion: 'Línea Base',
  ejecucion: 'Ejecución'
}

// ✅ GET /api/proyectos/[id]/cronograma - Obtener cronogramas del proyecto
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

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener todos los cronogramas del proyecto
    const cronogramas = await prisma.proyectoCronograma.findMany({
      where: { proyectoId: id },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({
      success: true,
      data: cronogramas
    })

  } catch (error) {
    logger.error('Error al obtener cronogramas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma - Crear nuevo tipo de cronograma
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

    // ✅ Validar datos de entrada
    const validatedData = createCronogramaSchema.parse(body)

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Validar límites por tipo de cronograma: MÁXIMO 1 POR TIPO

    // Validar comercial: máximo 1
    if (validatedData.tipo === 'comercial') {
      const existingComercial = await prisma.proyectoCronograma.count({
        where: {
          proyectoId: id,
          tipo: 'comercial'
        }
      })
      if (existingComercial > 0) {
        return NextResponse.json(
          { error: 'Ya existe un cronograma comercial para este proyecto. Solo se permite uno.' },
          { status: 400 }
        )
      }
    }

    // Validar planificación: máximo 1
    if (validatedData.tipo === 'planificacion') {
      const existingPlanificacion = await prisma.proyectoCronograma.count({
        where: {
          proyectoId: id,
          tipo: 'planificacion'
        }
      })
      if (existingPlanificacion > 0) {
        return NextResponse.json(
          { error: 'Ya existe un cronograma de planificación para este proyecto. Solo se permite uno.' },
          { status: 400 }
        )
      }
    }

    // Validar ejecución: máximo 1 y requiere baseline
    if (validatedData.tipo === 'ejecucion') {
      // Verificar que existe un baseline antes de crear ejecución
      const baselineExists = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          esBaseline: true
        }
      })
      if (!baselineExists) {
        return NextResponse.json(
          { error: 'Debe existir un cronograma de planificación marcado como baseline antes de crear uno de ejecución' },
          { status: 400 }
        )
      }

      const existingEjecucion = await prisma.proyectoCronograma.count({
        where: {
          proyectoId: id,
          tipo: 'ejecucion'
        }
      })
      if (existingEjecucion > 0) {
        return NextResponse.json(
          { error: 'Ya existe un cronograma de ejecución para este proyecto' },
          { status: 400 }
        )
      }
    }

    // ✅ Si es una copia de otro cronograma, copiar toda la estructura
    if (validatedData.copiarDesdeId) {

      // Verificar que el cronograma origen existe
      const cronogramaOrigen = await prisma.proyectoCronograma.findUnique({
        where: { id: validatedData.copiarDesdeId },
        include: {
          proyectoFase: {
            include: {
              proyectoEdt: {
                include: {
                  proyectoActividad: {
                    include: {
                      proyectoTarea: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!cronogramaOrigen) {
        return NextResponse.json(
          { error: 'Cronograma origen no encontrado' },
          { status: 404 }
        )
      }

      console.log('Copiando cronograma desde:', cronogramaOrigen.nombre, 'con', cronogramaOrigen.proyectoFase.length, 'fases')

      // Log detallado de la estructura
      console.log('Estructura del cronograma origen:', {
        fases: cronogramaOrigen.proyectoFase.length,
        edts: cronogramaOrigen.proyectoFase.reduce((acc: number, f: any) => acc + f.proyectoEdt.length, 0),
        actividades: cronogramaOrigen.proyectoFase.reduce((acc: number, f: any) => acc + f.proyectoEdt.reduce((acc2: number, e: any) => acc2 + e.proyectoActividad.length, 0), 0),
        tareas: cronogramaOrigen.proyectoFase.reduce((acc: number, f: any) => acc + f.proyectoEdt.reduce((acc2: number, e: any) => acc2 + e.proyectoActividad.reduce((acc3: number, a: any) => acc3 + a.proyectoTarea.length, 0), 0), 0)
      })

      // Crear el nuevo cronograma con nombre automático
      const nombreAutomatico = NOMBRES_CRONOGRAMA[validatedData.tipo] || validatedData.tipo
      const nuevoCronograma = await prisma.proyectoCronograma.create({
        data: {
          id: crypto.randomUUID(),
          proyectoId: id,
          tipo: validatedData.tipo,
          nombre: nombreAutomatico,
          copiadoDesdeCotizacionId: validatedData.copiadoDesdeCotizacionId,
          esBaseline: validatedData.tipo === 'planificacion', // Línea Base es baseline automáticamente
          bloqueado: validatedData.tipo === 'planificacion', // Baseline se bloquea automáticamente
          version: 1,
          updatedAt: new Date()
        }
      })

      // Copiar toda la estructura jerárquica
      let fasesCopiadas = 0
      let edtsCopiados = 0
      let actividadesCopiadas = 0
      let tareasCopiadas = 0
      const tareaIdMap = new Map<string, string>() // oldTareaId -> newTareaId

      try {
        for (const faseOrigen of cronogramaOrigen.proyectoFase) {
          console.log('Creando fase:', faseOrigen.nombre)

          const nuevaFase = await prisma.proyectoFase.create({
            data: {
              id: crypto.randomUUID(),
              proyectoId: id,
              proyectoCronogramaId: nuevoCronograma.id,
              nombre: faseOrigen.nombre,
              descripcion: faseOrigen.descripcion,
              orden: faseOrigen.orden,
              fechaInicioPlan: faseOrigen.fechaInicioPlan,
              fechaFinPlan: faseOrigen.fechaFinPlan,
              estado: faseOrigen.estado,
              updatedAt: new Date()
            }
          })
          fasesCopiadas++
          console.log('Fase creada:', nuevaFase.id)

          for (const edtOrigen of faseOrigen.proyectoEdt) {
            console.log('Creando EDT:', edtOrigen.nombre)

            const nuevoEdt = await prisma.proyectoEdt.create({
              data: {
                id: crypto.randomUUID(),
                proyectoId: id,
                proyectoFaseId: nuevaFase.id,
                proyectoCronogramaId: nuevoCronograma.id,
                nombre: edtOrigen.nombre,
                descripcion: edtOrigen.descripcion,
                edtId: (edtOrigen as any).edtId || null,
                fechaInicioPlan: edtOrigen.fechaInicioPlan,
                fechaFinPlan: edtOrigen.fechaFinPlan,
                horasPlan: edtOrigen.horasPlan,
                prioridad: edtOrigen.prioridad,
                orden: edtOrigen.orden,
                estado: edtOrigen.estado,
                responsableId: edtOrigen.responsableId,
                updatedAt: new Date()
              }
            })
            edtsCopiados++
            console.log('EDT creado:', nuevoEdt.id)

            for (const actividadOrigen of edtOrigen.proyectoActividad) {
              console.log('Creando actividad:', actividadOrigen.nombre)

              const nuevaActividad = await prisma.$queryRaw`
                INSERT INTO "proyecto_actividad" (
                  "id",
                  "proyectoEdtId",
                  "proyectoCronogramaId",
                  "nombre",
                  "descripcion",
                  "fechaInicioPlan",
                  "fechaFinPlan",
                  "horasPlan",
                  "prioridad",
                  "orden",
                  "estado",
                  "responsableId",
                  "createdAt",
                  "updatedAt"
                ) VALUES (
                  gen_random_uuid(),
                  ${nuevoEdt.id},
                  ${nuevoCronograma.id},
                  ${actividadOrigen.nombre},
                  ${actividadOrigen.descripcion},
                  ${actividadOrigen.fechaInicioPlan},
                  ${actividadOrigen.fechaFinPlan},
                  ${actividadOrigen.horasPlan},
                  ${actividadOrigen.prioridad}::"PrioridadEdt",
                  ${actividadOrigen.orden},
                  ${actividadOrigen.estado}::"EstadoActividad",
                  ${actividadOrigen.responsableId},
                  NOW(),
                  NOW()
                )
                RETURNING "id"
              ` as any

              const actividadId = nuevaActividad[0].id
              actividadesCopiadas++
              console.log('Actividad creada:', nuevaActividad.id)

              for (const tareaOrigen of actividadOrigen.proyectoTarea) {
                const newTareaId = crypto.randomUUID()
                tareaIdMap.set(tareaOrigen.id, newTareaId)

                await prisma.$queryRaw`
                  INSERT INTO "proyecto_tarea" (
                    "id",
                    "proyectoActividadId",
                    "proyectoCronogramaId",
                    "proyectoEdtId",
                    "nombre",
                    "descripcion",
                    "fechaInicio",
                    "fechaFin",
                    "horasEstimadas",
                    "personasEstimadas",
                    "prioridad",
                    "orden",
                    "estado",
                    "recursoId",
                    "responsableId",
                    "createdAt",
                    "updatedAt"
                  ) VALUES (
                    ${newTareaId}::uuid,
                    ${actividadId},
                    ${nuevoCronograma.id},
                    ${nuevoEdt.id},
                    ${tareaOrigen.nombre},
                    ${tareaOrigen.descripcion},
                    ${tareaOrigen.fechaInicio},
                    ${tareaOrigen.fechaFin},
                    ${tareaOrigen.horasEstimadas},
                    ${tareaOrigen.personasEstimadas || 1},
                    ${tareaOrigen.prioridad}::"PrioridadTarea",
                    ${tareaOrigen.orden},
                    ${tareaOrigen.estado}::"EstadoTarea",
                    ${tareaOrigen.recursoId},
                    ${tareaOrigen.responsableId},
                    NOW(),
                    NOW()
                  )
                `
                tareasCopiadas++
              }
            }
          }
        }
        // Copiar dependencias usando el mapping de IDs
        let dependenciasCopiadas = 0
        const sourceTareaIds = Array.from(tareaIdMap.keys())
        if (sourceTareaIds.length > 0) {
          const dependencias = await prisma.proyectoDependenciasTarea.findMany({
            where: {
              OR: [
                { tareaOrigenId: { in: sourceTareaIds } },
                { tareaDependienteId: { in: sourceTareaIds } }
              ]
            }
          })

          for (const dep of dependencias) {
            const newOrigenId = tareaIdMap.get(dep.tareaOrigenId)
            const newDependienteId = tareaIdMap.get(dep.tareaDependienteId)
            if (newOrigenId && newDependienteId) {
              await prisma.proyectoDependenciasTarea.create({
                data: {
                  id: crypto.randomUUID(),
                  tipo: dep.tipo,
                  tareaOrigenId: newOrigenId,
                  tareaDependienteId: newDependienteId,
                  lagMinutos: dep.lagMinutos,
                  updatedAt: new Date()
                }
              })
              dependenciasCopiadas++
            }
          }
        }

      } catch (copyError) {
        logger.error('Error durante la copia:', copyError)
        throw new Error(`Error copiando estructura: ${copyError instanceof Error ? copyError.message : 'Error desconocido'}`)
      }

      // Lock the baseline when ejecución is created from it
      if (validatedData.tipo === 'ejecucion' && cronogramaOrigen.esBaseline) {
        await prisma.proyectoCronograma.update({
          where: { id: cronogramaOrigen.id },
          data: { bloqueado: true, updatedAt: new Date() },
        })
      }

      console.log('Copia completada:', {
        fases: fasesCopiadas,
        edts: edtsCopiados,
        actividades: actividadesCopiadas,
        tareas: tareasCopiadas
      })

      return NextResponse.json({
        success: true,
        data: nuevoCronograma,
        message: `Cronograma copiado exitosamente (${fasesCopiadas} fases, ${edtsCopiados} EDTs, ${actividadesCopiadas} actividades, ${tareasCopiadas} tareas)`
      }, { status: 201 })
    }

    // ✅ Determinar si debe ser baseline
    let esBaseline = false
    if (validatedData.tipo === 'planificacion') {
      // Si es el primer cronograma de planificación, marcarlo como baseline automáticamente
      const existingPlanificacion = await prisma.proyectoCronograma.count({
        where: {
          proyectoId: id,
          tipo: 'planificacion'
        }
      })
      esBaseline = existingPlanificacion === 0 // Solo el primero es baseline
    }

    // ✅ Crear el cronograma con nombre automático
    const nombreAutomatico = NOMBRES_CRONOGRAMA[validatedData.tipo] || validatedData.tipo
    const createData = {
      id: crypto.randomUUID(),
      proyectoId: id,
      tipo: validatedData.tipo,
      nombre: nombreAutomatico,
      // Solo incluir copiadoDesdeCotizacionId si tiene valor (evitar undefined)
      ...(validatedData.copiadoDesdeCotizacionId ? { copiadoDesdeCotizacionId: validatedData.copiadoDesdeCotizacionId } : {}),
      esBaseline: esBaseline,
      bloqueado: false, // Se bloquea después de importar contenido
      version: 1,
      updatedAt: new Date()
    }
    console.log('📝 Creando cronograma con datos:', JSON.stringify(createData, null, 2))

    const cronograma = await prisma.proyectoCronograma.create({
      data: createData
    })

    return NextResponse.json({
      success: true,
      data: cronograma
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('❌ Error al crear cronograma:', error)
    logger.error('❌ Error type:', typeof error)
    logger.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown')
    logger.error('❌ Error message:', error instanceof Error ? error.message : String(error))
    logger.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace')

    // Extraer mensaje de error más específico
    let errorMessage = 'Error desconocido'
    if (error instanceof Error) {
      errorMessage = error.message
      // Si es un error de Prisma, extraer más detalles
      if ('code' in error) {
        errorMessage = `${error.message} (code: ${(error as any).code})`
      }
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

// ✅ DELETE /api/proyectos/[id]/cronograma/[cronogramaId] - Eliminar cronograma
export async function DELETE(
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
    const cronogramaId = searchParams.get('cronogramaId')

    if (!cronogramaId) {
      return NextResponse.json(
        { error: 'ID del cronograma es requerido' },
        { status: 400 }
      )
    }

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Validar que el cronograma existe y pertenece al proyecto
    const cronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        id: cronogramaId,
        proyectoId: id
      }
    })

    if (!cronograma) {
      return NextResponse.json(
        { error: 'Cronograma no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Baseline: solo se puede eliminar si no hay ejecución y el usuario tiene rol permitido
    if (cronograma.esBaseline) {
      const rolesPermitidos = ['admin', 'gerente', 'gestor', 'coordinador']
      const userRole = (session.user as any).role
      if (!rolesPermitidos.includes(userRole)) {
        return NextResponse.json(
          { error: 'No tiene permisos para eliminar el cronograma baseline.' },
          { status: 403 }
        )
      }
      const ejecucionExists = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId: id, tipo: 'ejecucion' }
      })
      if (ejecucionExists) {
        return NextResponse.json(
          { error: 'No se puede eliminar la línea base mientras exista un cronograma de ejecución.' },
          { status: 400 }
        )
      }
    }

    // ✅ No permitir eliminar cronogramas comerciales (son de solo lectura)
    if (cronograma.tipo === 'comercial') {
      return NextResponse.json(
        { error: 'No se puede eliminar el cronograma comercial. Los cronogramas comerciales son de solo lectura.' },
        { status: 400 }
      )
    }

    // ✅ No permitir eliminar cronogramas de ejecución si no hay otro baseline
    if (cronograma.tipo === 'ejecucion') {
      const baselineExists = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          esBaseline: true,
          tipo: 'planificacion'
        }
      })
      if (!baselineExists) {
        return NextResponse.json(
          { error: 'No se puede eliminar el cronograma de ejecución sin un cronograma de planificación baseline.' },
          { status: 400 }
        )
      }
    }

    // ✅ Verificar que no sea el único cronograma del proyecto
    const totalCronogramas = await prisma.proyectoCronograma.count({
      where: { proyectoId: id }
    })

    if (totalCronogramas <= 1) {
      return NextResponse.json(
        { error: 'No se puede eliminar el último cronograma del proyecto' },
        { status: 400 }
      )
    }

    // ✅ Eliminar el cronograma (las relaciones se eliminan en cascada)
    await prisma.proyectoCronograma.delete({
      where: { id: cronogramaId }
    })

    return NextResponse.json({
      success: true,
      message: 'Cronograma eliminado exitosamente'
    })

  } catch (error) {
    logger.error('Error al eliminar cronograma:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}