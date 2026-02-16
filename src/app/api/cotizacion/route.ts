// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/
// 🔧 Descripción: Maneja la obtención y creación de cotizaciones
// 🧠 Uso: GET para listar, POST para crear
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import type { CotizacionesPaginationParams } from '@/types/payloads'
import {
  parsePaginationParams,
  paginateQuery,
  PAGINATION_CONFIGS
} from '@/lib/utils/pagination'
import { generateNextCotizacionCode } from '@/lib/utils/cotizacionCodeGenerator'
import { registrarCreacion } from '@/lib/services/audit'

// ✅ Obtener cotizaciones con paginación optimizada
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // 🔧 Parsear parámetros usando utilidad optimizada
    const paginationParams = parsePaginationParams(
      searchParams, 
      PAGINATION_CONFIGS.cotizaciones
    )
    
    // 📡 Extraer filtros específicos de cotizaciones
    const clienteId = searchParams.get('clienteId')
    const comercialId = searchParams.get('comercialId')
    const estado = searchParams.get('estado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const anio = searchParams.get('anio')

    // 🔧 Construir filtros adicionales
    const additionalWhere = {
      ...(clienteId && { clienteId }),
      ...(comercialId && { comercialId }),
      ...(estado && estado !== 'todos' && { estado }),
      ...(fechaDesde && fechaHasta && {
        fecha: {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta)
        }
      }),
      ...(!fechaDesde && !fechaHasta && anio && anio !== 'todos' && {
        fecha: {
          gte: new Date(`${anio}-01-01T00:00:00.000Z`),
          lt: new Date(`${parseInt(anio) + 1}-01-01T00:00:00.000Z`)
        }
      })
    }
    
    // 📡 Función de consulta optimizada
    const queryFn = async ({ skip, take, where, orderBy }: any) => {
      return await prisma.cotizacion.findMany({
        where,
        select: {
          id: true,
          codigo: true, // ✅ Incluir código de cotización
          nombre: true,
          estado: true,
          totalInterno: true,
          totalCliente: true,
          createdAt: true,
          fecha: true,
          updatedAt: true,
          cliente: {
            select: {
              id: true,
              nombre: true,
              correo: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          plantilla: {
            select: {
              id: true,
              nombre: true,
              estado: true
            }
          },
          proyecto: {
            select: {
              id: true,
              codigo: true,
              estado: true,
            }
          },
          _count: {
            select: {
              cotizacionEquipo: true,
              cotizacionServicio: true
            }
          }
        },
        orderBy,
        skip,
        take
      })
    }
    
    // 📡 Función de conteo
    const countFn = async (where: any) => {
      return await prisma.cotizacion.count({ where })
    }
    
    // 🔁 Ejecutar paginación con utilidad optimizada
    const result = await paginateQuery(
      queryFn,
      countFn,
      paginationParams,
      [...(PAGINATION_CONFIGS.cotizaciones.searchFields || ['nombre'])],
      additionalWhere
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error)
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 })
  }
}

// ✅ Crear nueva cotización manual
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const data = await req.json()
    const { nombre, clienteId, comercialId, fecha } = data

    if (!nombre || !clienteId || !comercialId) {
      const missingFields = []
      if (!nombre) missingFields.push('nombre')
      if (!clienteId) missingFields.push('clienteId')
      if (!comercialId) missingFields.push('comercialId')
      return NextResponse.json({
        error: `Faltan campos requeridos: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    // ✅ Verificar que el cliente existe en la base de datos
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, nombre: true }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'El cliente especificado no existe' },
        { status: 400 }
      )
    }

    // ✅ Verificar que el usuario comercial existe en la base de datos
    const usuarioComercial = await prisma.user.findUnique({
      where: { id: comercialId },
      select: { id: true, name: true, email: true }
    })

    if (!usuarioComercial) {
      return NextResponse.json(
        { error: 'El usuario comercial especificado no existe' },
        { status: 400 }
      )
    }

    // 📡 Generar código automático con formato GYS-XXXX-YY
    const { codigo, numeroSecuencia } = await generateNextCotizacionCode()

    const nueva = await prisma.cotizacion.create({
      data: {
        id: `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nombre,
        clienteId,
        comercialId,
        codigo,
        numeroSecuencia,
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0,
        fecha: fecha ? new Date(fecha) : new Date(),
        updatedAt: new Date()
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // ✅ Registrar en auditoría
    try {
      await registrarCreacion(
        'COTIZACION',
        nueva.id,
        session.user.id,
        nueva.nombre,
        {
          cliente: nueva.clienteId || 'Cliente desconocido',
          codigo: nueva.codigo,
          comercial: nueva.comercialId || 'Comercial desconocido'
        }
      )
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
      // No fallar la creación por error de auditoría
    }

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear cotización:', error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({
          error: 'Ya existe una cotización con ese código. Intente nuevamente.'
        }, { status: 409 })
      }
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({
          error: 'Error de referencia: Verifique que el cliente y usuario comercial existan.'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      error: 'Error interno del servidor al crear la cotización'
    }, { status: 500 })
  }
}
