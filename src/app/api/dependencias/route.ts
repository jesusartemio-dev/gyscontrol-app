// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/dependencias/
// 🔧 Descripción: API REST para gestión de dependencias entre tareas
//    Endpoints: GET (listar), POST (crear)
//
// 🧠 Funcionalidades:
//    - Listar dependencias con filtros
//    - Crear nueva dependencia
//    - Validación de ciclos
//    - Validación con Zod
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { DependenciaTarea } from '@/types/modelos'
import type { 
  DependenciaTareaPayload,
  PaginatedResponse 
} from '@/types/payloads'

// 🔍 Schema de validación para crear dependencia
const createDependenciaSchema = z.object({
  tareaOrigenId: z.string().min(1, 'ID de tarea origen es requerido'),
  tareaDestinoId: z.string().min(1, 'ID de tarea destino es requerido'),
  tipo: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).default('finish_to_start')
})

// 🔍 Schema de validación para parámetros de consulta
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  tareaOrigenId: z.string().optional(),
  tareaDestinoId: z.string().optional(),
  tipo: z.string().optional(),
  proyectoServicioId: z.string().optional()
})

// 🔍 Función auxiliar para detectar ciclos en dependencias
async function detectarCiclo(tareaOrigenId: string, tareaDestinoId: string): Promise<boolean> {
  // Verificar si crear esta dependencia causaría un ciclo
  // Un ciclo existe si la tarea destino ya tiene un camino hacia la tarea origen
  
  const visitados = new Set<string>()
  const stack = [tareaDestinoId]
  
  while (stack.length > 0) {
    const tareaActual = stack.pop()!
    
    if (visitados.has(tareaActual)) {
      continue
    }
    
    visitados.add(tareaActual)
    
    // Si llegamos a la tarea origen, hay un ciclo
    if (tareaActual === tareaOrigenId) {
      return true
    }
    
    // Obtener todas las tareas que dependen de la tarea actual
    const dependencias = await prisma.dependenciaTarea.findMany({
      where: { tareaOrigenId: tareaActual },
      select: { tareaDependienteId: true }
    })
    
    for (const dep of dependencias) {
      if (!visitados.has(dep.tareaDependienteId)) {
        stack.push(dep.tareaDependienteId)
      }
    }
  }
  
  return false
}

// 📡 GET /api/dependencias - Listar dependencias con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    // ✅ Validar parámetros de consulta
    const validatedParams = querySchema.parse(params)
    const { page, limit, tareaOrigenId, tareaDestinoId, tipo, proyectoServicioId } = validatedParams
    
    // 🔍 Construir filtros dinámicos
    const where: any = {}
    
    if (tareaOrigenId) {
      where.tareaOrigenId = tareaOrigenId
    }
    
    if (tareaDestinoId) {
      where.tareaDestinoId = tareaDestinoId
    }
    
    if (tipo) {
      where.tipo = tipo
    }
    
    // Filtrar por proyecto servicio si se especifica
    if (proyectoServicioId) {
      where.OR = [
        {
          tareaOrigen: {
            proyectoServicioId: proyectoServicioId
          }
        },
        {
          tareaDestino: {
            proyectoServicioId: proyectoServicioId
          }
        }
      ]
    }
    
    // 📊 Calcular offset para paginación
    const offset = (page - 1) * limit
    
    // 🔍 Ejecutar consultas en paralelo
    const [dependencias, total] = await Promise.all([
      prisma.dependenciaTarea.findMany({
        where,
        include: {
          tareaOrigen: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              fechaInicio: true,
              fechaFin: true,
              proyectoServicio: {
                select: {
                  id: true,
                  categoria: true,
                  proyecto: {
                    select: {
                      id: true,
                      nombre: true,
                      codigo: true
                    }
                  }
                }
              }
            }
          },
          tareaDependiente: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              fechaInicio: true,
              fechaFin: true,
              proyectoServicio: {
                select: {
                  id: true,
                  categoria: true,
                  proyecto: {
                    select: {
                      id: true,
                      nombre: true,
                      codigo: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.dependenciaTarea.count({ where })
    ])
    
    // 📊 Construir metadatos de paginación
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    const response: PaginatedResponse<any> = {
      data: dependencias,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error al obtener dependencias:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// 📡 POST /api/dependencias - Crear nueva dependencia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Validar datos de entrada
    const validatedData = createDependenciaSchema.parse(body)
    
    // ⚠️ Verificar que no sea una auto-dependencia
    if (validatedData.tareaOrigenId === validatedData.tareaDestinoId) {
      return NextResponse.json(
        { error: 'Una tarea no puede depender de sí misma' },
        { status: 400 }
      )
    }
    
    // 🔍 Verificar que ambas tareas existen
    const [tareaOrigen, tareaDestino] = await Promise.all([
      prisma.tarea.findUnique({
        where: { id: validatedData.tareaOrigenId },
        select: { 
          id: true, 
          nombre: true, 
          estado: true,
          proyectoServicioId: true
        }
      }),
      prisma.tarea.findUnique({
        where: { id: validatedData.tareaDestinoId },
        select: { 
          id: true, 
          nombre: true, 
          estado: true,
          proyectoServicioId: true
        }
      })
    ])
    
    if (!tareaOrigen) {
      return NextResponse.json(
        { error: 'Tarea origen no encontrada' },
        { status: 404 }
      )
    }
    
    if (!tareaDestino) {
      return NextResponse.json(
        { error: 'Tarea destino no encontrada' },
        { status: 404 }
      )
    }
    
    // ⚠️ Verificar que las tareas pertenezcan al mismo proyecto servicio
    if (tareaOrigen.proyectoServicioId !== tareaDestino.proyectoServicioId) {
      return NextResponse.json(
        { error: 'Las tareas deben pertenecer al mismo proyecto servicio' },
        { status: 400 }
      )
    }
    
    // 🔍 Verificar que no exista ya esta dependencia
    const dependenciaExistente = await prisma.dependenciaTarea.findFirst({
      where: {
        tareaOrigenId: validatedData.tareaOrigenId,
        tareaDependienteId: validatedData.tareaDestinoId
      },
      select: { id: true }
    })
    
    if (dependenciaExistente) {
      return NextResponse.json(
        { error: 'Ya existe una dependencia entre estas tareas' },
        { status: 409 }
      )
    }
    
    // 🔄 Detectar ciclos
    const hayCiclo = await detectarCiclo(validatedData.tareaOrigenId, validatedData.tareaDestinoId)
    
    if (hayCiclo) {
      return NextResponse.json(
        { error: 'Esta dependencia crearía un ciclo en el grafo de tareas' },
        { status: 409 }
      )
    }
    
    // 📝 Crear la dependencia
    const nuevaDependencia = await prisma.dependenciaTarea.create({
      data: {
        tipo: validatedData.tipo,
        tareaOrigenId: validatedData.tareaOrigenId,
        tareaDependienteId: validatedData.tareaDestinoId
      },
      include: {
        tareaOrigen: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            proyectoServicio: {
              select: {
                id: true,
                categoria: true,
                proyecto: {
                  select: {
                    id: true,
                    nombre: true,
                    codigo: true
                  }
                }
              }
            }
          }
        },
        tareaDependiente: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            proyectoServicio: {
              select: {
                id: true,
                categoria: true,
                proyecto: {
                  select: {
                    id: true,
                    nombre: true,
                    codigo: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    return NextResponse.json(nuevaDependencia, { status: 201 })
    
  } catch (error) {
    console.error('❌ Error al crear dependencia:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
