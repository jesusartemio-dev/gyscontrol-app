// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/route.ts
// 🔧 Descripción: API para gestión de cronogramas de proyecto
// 🎯 Funcionalidades: CRUD de tipos de cronograma
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para crear cronograma
const createCronogramaSchema = z.object({
  tipo: z.enum(['comercial', 'planificacion', 'ejecucion']),
  nombre: z.string().min(1, 'El nombre es requerido'),
  copiadoDesdeCotizacionId: z.string().optional(),
  copiarDesdeId: z.string().optional(), // ID de cronograma origen para copiar
})

// ✅ GET /api/proyectos/[id]/cronograma - Obtener cronogramas del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔍 [API CRONOGRAMA] Iniciando GET /api/proyectos/[id]/cronograma')

  try {
    const { id } = await params
    console.log('🔍 [API CRONOGRAMA] Proyecto ID:', id)

    // ✅ Validar que el proyecto existe
    console.log('🔍 [API CRONOGRAMA] Verificando existencia del proyecto...')
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })
    console.log('✅ [API CRONOGRAMA] Proyecto encontrado:', proyecto?.nombre)

    if (!proyecto) {
      console.log('❌ [API CRONOGRAMA] Proyecto no encontrado')
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener todos los cronogramas del proyecto
    console.log('🔍 [API CRONOGRAMA] Consultando cronogramas en BD...')
    const cronogramas = await prisma.proyectoCronograma.findMany({
      where: { proyectoId: id },
      orderBy: { createdAt: 'asc' }
    })
    console.log('📊 [API CRONOGRAMA] Cronogramas básicos encontrados:', cronogramas.map((c: any) => ({ id: c.id, tipo: c.tipo, nombre: c.nombre })))
    console.log('✅ [API CRONOGRAMA] Cronogramas encontrados:', cronogramas.length)

    console.log('📤 [API CRONOGRAMA] Enviando respuesta exitosa')
    return NextResponse.json({
      success: true,
      data: cronogramas
    })

  } catch (error) {
    console.error('❌ [API CRONOGRAMA] Error al obtener cronogramas:', error)
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
  console.log('🔍 [API CRONOGRAMA POST] Iniciando POST /api/proyectos/[id]/cronograma')

  try {
    const { id } = await params
    console.log('🔍 [API CRONOGRAMA POST] Proyecto ID:', id)

    const body = await request.json()
    console.log('📦 [API CRONOGRAMA POST] Body recibido:', body)

    // ✅ Validar datos de entrada
    const validatedData = createCronogramaSchema.parse(body)
    console.log('✅ [API CRONOGRAMA POST] Datos validados:', validatedData)

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

    // ✅ Verificar que no existe un cronograma del mismo tipo
    console.log('🔍 [API CRONOGRAMA POST] Verificando cronograma existente...')
    const existingCronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId: id,
        tipo: validatedData.tipo
      }
    })
    console.log('📊 [API CRONOGRAMA POST] Cronograma existente:', existingCronograma ? 'SÍ existe' : 'NO existe')

    if (existingCronograma) {
      console.log('❌ [API CRONOGRAMA POST] Ya existe cronograma del mismo tipo')
      return NextResponse.json(
        { error: `Ya existe un cronograma de tipo ${validatedData.tipo}` },
        { status: 400 }
      )
    }

    // ✅ Si es una copia de otro cronograma
    if (validatedData.copiarDesdeId) {
      console.log('🔄 [API CRONOGRAMA POST] Copiando desde otro cronograma:', validatedData.copiarDesdeId)

      // Verificar que el cronograma origen existe
      const cronogramaOrigen = await prisma.proyectoCronograma.findUnique({
        where: { id: validatedData.copiarDesdeId },
        include: {
          fases: {
            include: {
              edts: {
                include: {
                  ProyectoTarea: true
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

      // Crear el nuevo cronograma
      const nuevoCronograma = await prisma.proyectoCronograma.create({
        data: {
          proyectoId: id,
          tipo: validatedData.tipo,
          nombre: validatedData.nombre,
          copiadoDesdeCotizacionId: validatedData.copiadoDesdeCotizacionId,
          esBaseline: false,
          version: 1
        }
      })

      console.log('✅ [API CRONOGRAMA POST] Nuevo cronograma creado:', nuevoCronograma.id)

      // Copiar fases, EDTs y tareas
      for (const faseOrigen of cronogramaOrigen.fases) {
        console.log('📋 Copiando fase:', faseOrigen.nombre)

        const nuevaFase = await prisma.proyectoFase.create({
          data: {
            proyectoId: id,
            proyectoCronogramaId: nuevoCronograma.id,
            nombre: faseOrigen.nombre,
            descripcion: faseOrigen.descripcion,
            orden: faseOrigen.orden,
            estado: 'planificado',
            porcentajeAvance: 0,
            fechaInicioPlan: faseOrigen.fechaInicioPlan,
            fechaFinPlan: faseOrigen.fechaFinPlan
          }
        })

        console.log('✅ Fase copiada:', nuevaFase.id)

        // Copiar EDTs de esta fase
        for (const edtOrigen of faseOrigen.edts) {
          console.log('🔧 Copiando EDT:', edtOrigen.nombre)

          const nuevoEdt = await prisma.proyectoEdt.create({
            data: {
              proyectoId: id,
              proyectoCronogramaId: nuevoCronograma.id,
              proyectoFaseId: nuevaFase.id,
              nombre: edtOrigen.nombre,
              categoriaServicioId: edtOrigen.categoriaServicioId,
              zona: edtOrigen.zona,
              fechaInicioPlan: edtOrigen.fechaInicioPlan,
              fechaFinPlan: edtOrigen.fechaFinPlan,
              horasPlan: edtOrigen.horasPlan,
              responsableId: edtOrigen.responsableId,
              descripcion: edtOrigen.descripcion,
              prioridad: edtOrigen.prioridad,
              estado: 'planificado',
              porcentajeAvance: 0
            }
          })

          console.log('✅ EDT copiado:', nuevoEdt.id)

          // Copiar tareas del EDT
          for (const tareaOrigen of edtOrigen.ProyectoTarea || []) {
            console.log('📝 Copiando tarea:', tareaOrigen.nombre)

            await prisma.proyectoTarea.create({
              data: {
                proyectoEdtId: nuevoEdt.id,
                proyectoCronogramaId: nuevoCronograma.id,
                nombre: tareaOrigen.nombre,
                descripcion: tareaOrigen.descripcion,
                fechaInicio: tareaOrigen.fechaInicio,
                fechaFin: tareaOrigen.fechaFin,
                horasEstimadas: tareaOrigen.horasEstimadas,
                prioridad: tareaOrigen.prioridad,
                responsableId: tareaOrigen.responsableId,
                estado: 'pendiente',
                porcentajeCompletado: 0
              }
            })
          }
        }
      }

      console.log('✅ [API CRONOGRAMA POST] Copia completa del cronograma terminada')

      return NextResponse.json({
        success: true,
        data: nuevoCronograma,
        message: 'Cronograma copiado exitosamente'
      }, { status: 201 })
    }

    // ✅ Crear el cronograma
    console.log('🏗️ [API CRONOGRAMA POST] Creando nuevo cronograma...')
    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        proyectoId: id,
        tipo: validatedData.tipo,
        nombre: validatedData.nombre,
        copiadoDesdeCotizacionId: validatedData.copiadoDesdeCotizacionId,
        esBaseline: false,
        version: 1
      }
    })
    console.log('✅ [API CRONOGRAMA POST] Cronograma creado:', cronograma.id)

    return NextResponse.json({
      success: true,
      data: cronograma
    }, { status: 201 })

  } catch (error) {
    console.error('❌ [API CRONOGRAMA POST] Error completo:', error)

    if (error instanceof z.ZodError) {
      console.log('❌ [API CRONOGRAMA POST] Error de validación Zod:', error.errors)
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    // Log detailed error information
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('❌ [API CRONOGRAMA POST] Error de Prisma - Código:', (error as any).code)
      console.error('❌ [API CRONOGRAMA POST] Error de Prisma - Meta:', (error as any).meta)
    }

    console.error('❌ [API CRONOGRAMA POST] Error al crear cronograma:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: (error as any)?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

// ✅ Función auxiliar para copiar cronograma - NO IMPLEMENTADA AÚN
// TODO: Implementar cuando se necesite la funcionalidad de copia