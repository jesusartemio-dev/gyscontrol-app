/**
 * API de debugging para verificar EDTs
 * Permite diagnosticar problemas de foreign keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const edtId = searchParams.get('edtId')

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'proyectoId requerido' },
        { status: 400 }
      )
    }

    console.log('🔍 DEBUG EDT: Verificando proyectoId:', proyectoId, 'edtId:', edtId)

    // 1. Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json({
        error: 'Proyecto no encontrado',
        proyectoId
      }, { status: 404 })
    }

    console.log('✅ DEBUG EDT: Proyecto encontrado:', proyecto.nombre)

    // 2. Verificar EDTs del cronograma de ejecución
    const cronogramaEjecucion = await prisma.proyectoCronograma.findFirst({
      where: { 
        proyectoId,
        tipo: 'ejecucion'
      },
      select: { id: true, nombre: true }
    })

    console.log('🔍 DEBUG EDT: Cronograma ejecución:', cronogramaEjecucion)

    let proyectoEdts: Array<{
      id: string
      nombre: string
      edtId: string
      edt: { id: string; nombre: string } | null
    }> = []
    if (cronogramaEjecucion) {
      proyectoEdts = await prisma.proyectoEdt.findMany({
        where: {
          proyectoId,
          proyectoCronogramaId: cronogramaEjecucion.id
        },
        select: {
          id: true,
          nombre: true,
          edtId: true,
          edt: {
            select: { id: true, nombre: true }
          }
        }
      })
    }

    console.log('🔍 DEBUG EDT: EDTs encontrados:', proyectoEdts.length)

    // 3. Verificar si el edtId específico existe
    let edtEspecifico = null
    if (edtId) {
      edtEspecifico = await prisma.proyectoEdt.findUnique({
        where: { id: edtId },
        select: {
          id: true,
          nombre: true,
          proyectoId: true,
          proyectoCronogramaId: true,
          edt: {
            select: { id: true, nombre: true }
          }
        }
      })
    }

    console.log('🔍 DEBUG EDT: EDT específico:', edtEspecifico)

    // 4. Verificar servicios del proyecto
    const proyectoServicios = await prisma.proyectoServicioCotizado.findMany({
      where: { proyectoId },
      select: {
        id: true,
        nombre: true,
        categoria: true
      }
    })

    console.log('🔍 DEBUG EDT: Servicios del proyecto:', proyectoServicios.length)

    return NextResponse.json({
      success: true,
      data: {
        proyecto: {
          id: proyecto.id,
          nombre: proyecto.nombre
        },
        cronogramaEjecucion,
        totalEdts: proyectoEdts.length,
        edts: proyectoEdts,
        edtEspecifico,
        servicios: proyectoServicios
      }
    })

  } catch (error) {
    console.error('❌ DEBUG EDT Error:', error)
    return NextResponse.json(
      { 
        error: 'Error en debugging EDT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}