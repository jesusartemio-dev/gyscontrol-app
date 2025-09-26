// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantilla
// 🔧 Descripción: Obtener o crear plantillas con sus relaciones
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ✅ Obtener todas las plantillas con sus relaciones, opcionalmente filtradas por tipo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') // 'completa' | 'equipos' | 'servicios' | 'gastos' | null

    // ✅ Si se especifica un tipo independiente, buscar en la tabla correspondiente Y en plantillas completas que tengan esa sección
    if (tipo === 'equipos') {
      const [plantillasIndependientes, plantillasCompletas] = await Promise.all([
        // Plantillas independientes de equipos
        prisma.plantillaEquipoIndependiente.findMany({
          include: {
            items: {
              include: {
                catalogoEquipo: true
              }
            },
            _count: {
              select: { items: true }
            }
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Plantillas completas que tienen equipos
        prisma.plantilla.findMany({
          where: {
            equipos: {
              some: {} // Tiene al menos un equipo
            }
          },
          include: {
            equipos: {
              include: {
                items: true,
              },
            },
            servicios: {
              include: {
                items: true,
              },
            },
            gastos: {
              include: {
                items: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      ])

      const todasLasPlantillas = [...plantillasIndependientes, ...plantillasCompletas]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return NextResponse.json(todasLasPlantillas)
    }

    if (tipo === 'servicios') {
      const [plantillasIndependientes, plantillasCompletas] = await Promise.all([
        // Plantillas independientes de servicios
        prisma.plantillaServicioIndependiente.findMany({
          include: {
            items: {
              include: {
                catalogoServicio: true,
                recurso: true,
                unidadServicio: true
              }
            },
            _count: {
              select: { items: true }
            }
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Plantillas completas que tienen servicios
        prisma.plantilla.findMany({
          where: {
            servicios: {
              some: {} // Tiene al menos un servicio
            }
          },
          include: {
            equipos: {
              include: {
                items: true,
              },
            },
            servicios: {
              include: {
                items: true,
              },
            },
            gastos: {
              include: {
                items: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      ])

      const todasLasPlantillas = [...plantillasIndependientes, ...plantillasCompletas]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return NextResponse.json(todasLasPlantillas)
    }

    if (tipo === 'gastos') {
      const [plantillasIndependientes, plantillasCompletas] = await Promise.all([
        // Plantillas independientes de gastos
        prisma.plantillaGastoIndependiente.findMany({
          include: {
            items: true,
            _count: {
              select: { items: true }
            }
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Plantillas completas que tienen gastos
        prisma.plantilla.findMany({
          where: {
            gastos: {
              some: {} // Tiene al menos un gasto
            }
          },
          include: {
            equipos: {
              include: {
                items: true,
              },
            },
            servicios: {
              include: {
                items: true,
              },
            },
            gastos: {
              include: {
                items: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      ])

      const todasLasPlantillas = [...plantillasIndependientes, ...plantillasCompletas]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return NextResponse.json(todasLasPlantillas)
    }

    // ✅ Para tipo 'completa' o sin filtro, buscar en todas las tablas
    if (!tipo || tipo === 'completa') {
      const [plantillasCompletas, plantillasEquipos, plantillasServicios, plantillasGastos] = await Promise.all([
        // Plantillas completas
        prisma.plantilla.findMany({
          where: tipo === 'completa' ? { tipo: 'completa' } : {},
          include: {
            equipos: {
              include: {
                items: true,
              },
            },
            servicios: {
              include: {
                items: true,
              },
            },
            gastos: {
              include: {
                items: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        // ❌ REMOVED: Plantillas independientes no deben estar en la API general
        // Solo devolver plantillas completas
        Promise.resolve([]),
        Promise.resolve([]),
        Promise.resolve([])
      ])

      // Solo devolver plantillas completas (plantillas independientes van por APIs específicas)
      const todasLasPlantillas = [...plantillasCompletas]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return NextResponse.json(todasLasPlantillas)
    }

    // ✅ Fallback para otros tipos (no debería llegar aquí)
    return NextResponse.json([])
  } catch (error) {
    console.error('❌ Error al obtener plantillas:', error)
    return NextResponse.json(
      { error: 'Error al obtener plantillas' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva plantilla
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { nombre, tipo = 'completa' } = data

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 })
    }

    // Validar tipo
    const tiposValidos = ['completa', 'equipos', 'servicios', 'gastos']
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({
        error: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
      }, { status: 400 })
    }

    // ✅ Si es un tipo independiente, crear en la tabla correspondiente
    if (tipo === 'equipos') {
      const nueva = await prisma.plantillaEquipoIndependiente.create({
        data: {
          nombre,
          estado: 'borrador',
          totalInterno: 0,
          totalCliente: 0,
        },
      })
      return NextResponse.json(nueva, { status: 201 })
    }

    if (tipo === 'servicios') {
      const nueva = await prisma.plantillaServicioIndependiente.create({
        data: {
          nombre,
          categoria: 'General', // Default category
          estado: 'borrador',
          totalInterno: 0,
          totalCliente: 0,
        },
      })
      return NextResponse.json(nueva, { status: 201 })
    }

    if (tipo === 'gastos') {
      const nueva = await prisma.plantillaGastoIndependiente.create({
        data: {
          nombre,
          estado: 'borrador',
          totalInterno: 0,
          totalCliente: 0,
        },
      })
      return NextResponse.json(nueva, { status: 201 })
    }

    // ✅ Para tipo 'completa', crear en la tabla Plantilla
    const nueva = await prisma.plantilla.create({
      data: {
        nombre,
        tipo: tipo as any,
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0,
      },
    })

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear plantilla:', error)
    return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 })
  }
}
