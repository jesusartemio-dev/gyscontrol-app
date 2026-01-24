/**
 * API de Diagnóstico de Base de Datos - Horas Hombre
 * 
 * Revisa el estado actual de los datos en la BD para el sistema de horas-hombre
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Consultar todas las tablas relevantes
    const [
      proyectos,
      cronogramas,
      proyectoEdts,
      edtsMaestros,
      registrosHoras,
      serviciosProyecto,
      proyectoServicios
    ] = await Promise.all([
      // 1. Proyectos
      prisma.proyecto.findMany({
        select: {
          id: true,
          nombre: true,
          codigo: true,
          estado: true,
          fechaInicio: true,
          fechaFin: true
        }
      }),
      
      // 2. Cronogramas de proyecto
      prisma.proyectoCronograma.findMany({
        select: {
          id: true,
          proyectoId: true,
          tipo: true,
          nombre: true
        }
      }),
      
      // 3. EDTs de proyecto
      prisma.proyectoEdt.findMany({
        select: {
          id: true,
          proyectoId: true,
          nombre: true,
          edtId: true,
          horasPlan: true,
          horasReales: true,
          estado: true
        }
      }),
      
      // 4. EDTs maestros
      prisma.edt.findMany({
        select: {
          id: true,
          nombre: true,
          descripcion: true
        }
      }),
      
      // 5. Registros de horas
      prisma.registroHoras.findMany({
        select: {
          id: true,
          proyectoId: true,
          horasTrabajadas: true,
          fechaTrabajo: true,
          edtId: true
        }
      }),
      
      // 6. Servicios del proyecto (nueva tabla)
      prisma.proyectoServicioCotizado.findMany({
        select: {
          id: true,
          proyectoId: true,
          nombre: true
        }
      }),
      
      // 7. Items de servicios del proyecto
      prisma.proyectoServicioCotizadoItem.findMany({
        select: {
          id: true,
          proyectoServicioId: true,
          nombre: true,
          categoria: true,
          horasEjecutadas: true,
          cantidadHoras: true
        }
      })
    ])

    // Calcular estadísticas
    const diagnostico = {
      resumen: {
        totalProyectos: proyectos.length,
        totalCronogramas: cronogramas.length,
        totalProyectoEdts: proyectoEdts.length,
        totalEdtsMaestros: edtsMaestros.length,
        totalRegistrosHoras: registrosHoras.length,
        totalServiciosProyecto: proyectoServicios.length,
        totalItemsServicios: proyectoServicios.length
      },
      
      proyectos: {
        total: proyectos.length,
        porEstado: proyectos.reduce((acc, p) => {
          acc[p.estado] = (acc[p.estado] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        ejemplos: proyectos.slice(0, 5)
      },
      
      cronogramas: {
        total: cronogramas.length,
        porTipo: cronogramas.reduce((acc, c) => {
          acc[c.tipo] = (acc[c.tipo] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        ejemplos: cronogramas.slice(0, 5)
      },
      
      proyectoEdts: {
        total: proyectoEdts.length,
        conHoras: proyectoEdts.filter(edt => Number(edt.horasReales) > 0).length,
        categorias: [...new Set(proyectoEdts.map(edt => edt.edtId))].length,
        ejemplos: proyectoEdts.slice(0, 5)
      },
      
      edtsMaestros: {
        total: edtsMaestros.length,
        ejemplos: edtsMaestros.slice(0, 10)
      },
      
      registrosHoras: {
        total: registrosHoras.length,
        conHoras: registrosHoras.filter(r => Number(r.horasTrabajadas) > 0).length,
        totalHoras: registrosHoras.reduce((sum, r) => sum + Number(r.horasTrabajadas), 0),
        ejemplos: registrosHoras.slice(0, 5)
      },
      
      serviciosProyecto: {
        total: proyectoServicios.length,
        ejemplos: proyectoServicios.slice(0, 5)
      },
      
      relaciones: {
        proyectosSinCronograma: proyectos.filter(p => 
          !cronogramas.some(c => c.proyectoId === p.id)
        ).length,
        
        cronogramasSinEdt: cronogramas.filter(c =>
          !proyectoEdts.some(edt => edt.proyectoId === c.proyectoId)
        ).length,
        
        edtsSinMaestro: proyectoEdts.filter(edt =>
          !edtsMaestros.some(m => m.id === edt.edtId)
        ).length
      }
    }

    return NextResponse.json({
      success: true,
      diagnostico,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en diagnóstico de BD:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}