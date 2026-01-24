// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/proyectos/[id]/cronograma/generar
// 🔧 Descripción: Generación automática de cronograma desde servicios del proyecto
// ✅ POST: Generar estructura jerárquica (Fases > EDTs > Actividades > Tareas)
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const generateSchema = z.object({
  generarFases: z.boolean().optional().default(true),
  generarEdts: z.boolean().optional().default(true),
  generarActividades: z.boolean().optional().default(true),
  generarTareas: z.boolean().optional().default(true),
  fechaInicioProyecto: z.string().optional(),
  cronogramaId: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = generateSchema.parse(body)

    console.log('🚀 [GENERAR CRONOGRAMA] Iniciando generación para proyecto:', proyectoId)
    console.log('📋 [GENERAR CRONOGRAMA] Opciones:', validatedData)

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        proyectoServicioCotizado: {
          include: {
            user: true
          }
        },
        cotizacion: {
          include: {
            cotizacionServicio: {
              include: {
                cotizacionServicioItem: true,
                cotizacionEdt: true
              }
            }
          }
        }
      }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'proyectos'

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para generar cronograma' }, { status: 403 })
    }

    // Obtener o crear cronograma de ejecución
    let cronograma = validatedData.cronogramaId
      ? await prisma.proyectoCronograma.findUnique({ where: { id: validatedData.cronogramaId } })
      : await prisma.proyectoCronograma.findFirst({
          where: {
            proyectoId,
            tipo: 'ejecucion'
          }
        })

    if (!cronograma) {
      // Verificar si existe baseline para crear ejecución
      const baseline = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId,
          esBaseline: true
        }
      })

      if (!baseline) {
        return NextResponse.json({
          error: 'Debe existir un cronograma de planificación (baseline) antes de generar uno de ejecución'
        }, { status: 400 })
      }

      // Crear cronograma de ejecución
      cronograma = await prisma.proyectoCronograma.create({
        data: {
          id: crypto.randomUUID(),
          proyectoId,
          tipo: 'ejecucion',
          nombre: 'Cronograma de Ejecución',
          esBaseline: false,
          version: 1,
          updatedAt: new Date()
        }
      })

      console.log('✅ [GENERAR CRONOGRAMA] Cronograma de ejecución creado:', cronograma.id)
    }

    // Determinar fuente de datos: servicios del proyecto o cotización
    const serviciosFuente = proyecto.proyectoServicioCotizado.length > 0
      ? proyecto.proyectoServicioCotizado
      : proyecto.cotizacion?.cotizacionServicio || []

    if (serviciosFuente.length === 0) {
      return NextResponse.json({
        error: 'No hay servicios disponibles para generar el cronograma. Agregue servicios al proyecto o cotización primero.'
      }, { status: 400 })
    }

    console.log(`📊 [GENERAR CRONOGRAMA] Servicios encontrados: ${serviciosFuente.length}`)

    // Generar estructura del cronograma
    const result = await generarEstructuraCronograma({
      proyectoId,
      cronogramaId: cronograma.id,
      servicios: serviciosFuente,
      opciones: validatedData,
      fechaInicio: validatedData.fechaInicioProyecto ? new Date(validatedData.fechaInicioProyecto) : new Date()
    })

    return NextResponse.json({
      success: true,
      data: {
        cronograma,
        ...result,
        message: `Cronograma generado exitosamente con ${result.totalElements} elementos`
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ [GENERAR CRONOGRAMA] Error:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función principal para generar estructura del cronograma
async function generarEstructuraCronograma({
  proyectoId,
  cronogramaId,
  servicios,
  opciones,
  fechaInicio
}: {
  proyectoId: string
  cronogramaId: string
  servicios: any[]
  opciones: z.infer<typeof generateSchema>
  fechaInicio: Date
}) {
  const result = {
    fasesGeneradas: 0,
    edtsGenerados: 0,
    actividadesGeneradas: 0,
    tareasGeneradas: 0,
    totalElements: 0
  }

  console.log('🚀 [GENERAR] Iniciando generación de estructura')

  // 1. Crear fases por defecto si se solicita
  const fasesCreadas: any[] = []

  if (opciones.generarFases) {
    const fasesDefault = [
      { nombre: 'Ingeniería', descripcion: 'Fase de diseño e ingeniería', orden: 1 },
      { nombre: 'Procura', descripcion: 'Fase de adquisición de materiales y equipos', orden: 2 },
      { nombre: 'Construcción', descripcion: 'Fase de construcción y montaje', orden: 3 },
      { nombre: 'Pruebas', descripcion: 'Fase de pruebas y puesta en marcha', orden: 4 }
    ]

    let fechaFase = new Date(fechaInicio)

    for (const faseData of fasesDefault) {
      // Verificar si ya existe la fase
      const faseExistente = await prisma.proyectoFase.findFirst({
        where: {
          proyectoId,
          proyectoCronogramaId: cronogramaId,
          nombre: faseData.nombre
        }
      })

      if (!faseExistente) {
        const fechaFinFase = new Date(fechaFase)
        fechaFinFase.setDate(fechaFinFase.getDate() + 30) // 30 días por fase

        const fase = await prisma.proyectoFase.create({
          data: {
            id: crypto.randomUUID(),
            proyectoId,
            proyectoCronogramaId: cronogramaId,
            nombre: faseData.nombre,
            descripcion: faseData.descripcion,
            orden: faseData.orden,
            estado: 'planificado',
            fechaInicioPlan: fechaFase,
            fechaFinPlan: fechaFinFase,
            updatedAt: new Date()
          }
        })
        fasesCreadas.push(fase)
        result.fasesGeneradas++
        console.log(`📅 [GENERAR] Fase creada: ${fase.nombre}`)

        fechaFase = new Date(fechaFinFase)
        fechaFase.setDate(fechaFase.getDate() + 1) // Siguiente día
      } else {
        fasesCreadas.push(faseExistente)
        console.log(`📅 [GENERAR] Fase existente: ${faseExistente.nombre}`)
      }
    }
  }

  // 2. Agrupar servicios por EDT/categoría
  if (opciones.generarEdts) {
    // 2.1 Extraer todos los IDs de EDT únicos de los servicios
    const edtIdsUnicos = new Set<string>()
    for (const servicio of servicios) {
      const edtId = servicio.edtId || servicio.categoria || (servicio.cotizacionEdt?.edtId)
      if (edtId) {
        edtIdsUnicos.add(edtId)
      }
    }

    // 2.2 Obtener nombres de EDT desde el catálogo
    const edtsCatalogo = await prisma.edt.findMany({
      where: {
        id: { in: Array.from(edtIdsUnicos) }
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true
      }
    })

    // Crear mapa de ID -> nombre del catálogo
    const edtNombresMap = new Map<string, string>()
    for (const edt of edtsCatalogo) {
      edtNombresMap.set(edt.id, edt.nombre)
    }

    console.log(`📊 [GENERAR] EDTs encontrados en catálogo: ${edtsCatalogo.length}`)
    edtsCatalogo.forEach(e => console.log(`   - ${e.id}: ${e.nombre}`))

    // 2.3 Agrupar servicios por EDT
    const serviciosPorEdt = new Map<string, { edtId: string, edtNombre: string, servicios: any[] }>()

    for (const servicio of servicios) {
      // Obtener EDT del servicio
      const edtId = servicio.edtId || servicio.categoria || (servicio.cotizacionEdt?.edtId) || 'sin-categoria'
      // ✅ Obtener nombre SIEMPRE del catálogo EDT, NO del servicio
      const edtNombre = edtNombresMap.get(edtId) || `EDT ${edtId}`

      if (!serviciosPorEdt.has(edtId)) {
        serviciosPorEdt.set(edtId, { edtId, edtNombre, servicios: [] })
      }
      serviciosPorEdt.get(edtId)!.servicios.push(servicio)
    }

    console.log(`📊 [GENERAR] EDTs a generar: ${serviciosPorEdt.size}`)

    // Asignar EDTs a fases de forma balanceada
    const fasesDisponibles = fasesCreadas.length > 0 ? fasesCreadas : [null]
    let faseIndex = 0

    for (const [edtId, edtData] of serviciosPorEdt.entries()) {
      // Verificar si el EDT ya existe
      const edtExistente = await prisma.proyectoEdt.findFirst({
        where: {
          proyectoId,
          proyectoCronogramaId: cronogramaId,
          edtId: edtId
        }
      })

      let edt = edtExistente

      if (!edtExistente) {
        // Calcular horas totales de los servicios
        const horasTotales = edtData.servicios.reduce((sum: number, s: any) => {
          const items = s.cotizacionServicioItem || s.items || []
          return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.horaTotal || item.horas || 0), 0)
        }, 0)

        const faseAsignada = fasesDisponibles[faseIndex % fasesDisponibles.length]
        faseIndex++

        const fechaInicioEdt = faseAsignada?.fechaInicioPlan || fechaInicio
        const diasEstimados = Math.max(7, Math.ceil(horasTotales / 8))
        const fechaFinEdt = new Date(fechaInicioEdt)
        fechaFinEdt.setDate(fechaFinEdt.getDate() + diasEstimados)

        edt = await prisma.proyectoEdt.create({
          data: {
            id: crypto.randomUUID(),
            proyectoId,
            proyectoCronogramaId: cronogramaId,
            proyectoFaseId: faseAsignada?.id || null,
            nombre: edtData.edtNombre,
            edtId: edtId,
            fechaInicioPlan: fechaInicioEdt,
            fechaFinPlan: fechaFinEdt,
            horasPlan: horasTotales,
            estado: 'planificado',
            descripcion: `EDT generado automáticamente`,
            updatedAt: new Date()
          }
        })

        result.edtsGenerados++
        console.log(`🏗️ [GENERAR] EDT creado: ${edt.nombre} (${horasTotales}h)`)
      } else {
        console.log(`🏗️ [GENERAR] EDT existente: ${edtExistente.nombre}`)
      }

      // 3. Crear actividades desde servicios
      if (opciones.generarActividades && edt) {
        for (const servicio of edtData.servicios) {
          const items = servicio.cotizacionServicioItem || servicio.items || []
          const horasServicio = items.reduce((sum: number, item: any) => sum + (item.horaTotal || item.horas || 0), 0)

          // Verificar si la actividad ya existe
          const actividadExistente = await prisma.proyectoActividad.findFirst({
            where: {
              proyectoEdtId: edt.id,
              nombre: servicio.nombre || servicio.descripcion || 'Servicio'
            }
          })

          if (!actividadExistente) {
            const fechaInicioAct = edt.fechaInicioPlan || fechaInicio
            const diasAct = Math.max(1, Math.ceil(horasServicio / 8))
            const fechaFinAct = new Date(fechaInicioAct)
            fechaFinAct.setDate(fechaFinAct.getDate() + diasAct)

            const actividad = await prisma.proyectoActividad.create({
              data: {
                id: crypto.randomUUID(),
                proyectoEdtId: edt.id,
                proyectoCronogramaId: cronogramaId,
                nombre: servicio.nombre || servicio.descripcion || 'Servicio',
                descripcion: `Actividad generada desde servicio`,
                fechaInicioPlan: fechaInicioAct,
                fechaFinPlan: fechaFinAct,
                horasPlan: horasServicio,
                estado: 'pendiente',
                prioridad: 'media',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })

            result.actividadesGeneradas++
            console.log(`⚙️ [GENERAR] Actividad creada: ${actividad.nombre}`)

            // 4. Crear tareas desde items del servicio
            if (opciones.generarTareas && items.length > 0) {
              for (const item of items) {
                const tareaExistente = await prisma.proyectoTarea.findFirst({
                  where: {
                    proyectoActividadId: actividad.id,
                    nombre: item.nombre || item.descripcion || 'Item'
                  }
                })

                if (!tareaExistente) {
                  const horasItem = item.horaTotal || item.horas || 0
                  const diasItem = Math.max(1, Math.ceil(horasItem / 8))
                  const fechaFinItem = new Date(fechaInicioAct)
                  fechaFinItem.setDate(fechaFinItem.getDate() + diasItem)

                  await prisma.proyectoTarea.create({
                    data: {
                      id: crypto.randomUUID(),
                      proyectoEdtId: edt.id,
                      proyectoActividadId: actividad.id,
                      proyectoCronogramaId: cronogramaId,
                      nombre: item.nombre || item.descripcion || 'Item',
                      descripcion: item.descripcion || `Tarea generada`,
                      fechaInicio: fechaInicioAct,
                      fechaFin: fechaFinItem,
                      horasEstimadas: horasItem,
                      estado: 'pendiente',
                      prioridad: 'media',
                      updatedAt: new Date()
                    }
                  })

                  result.tareasGeneradas++
                }
              }
            }
          }
        }
      }
    }
  }

  result.totalElements = result.fasesGeneradas + result.edtsGenerados + result.actividadesGeneradas + result.tareasGeneradas

  console.log('✅ [GENERAR] Generación completada:', result)

  return result
}
