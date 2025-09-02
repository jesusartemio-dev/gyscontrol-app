// ===================================================
// 📁 Archivo: route.ts
// 📌 Descripción: API Route para gestión de proyectos
// 🧠 Uso: CRUD de proyectos
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock data for demonstration
const mockProyectos = [
  {
    id: '1',
    nombre: 'Proyecto Alpha',
    descripcion: 'Proyecto de desarrollo de software',
    estado: 'activo',
    fechaInicio: '2024-01-15',
    fechaFin: '2024-12-31',
    presupuesto: 150000,
    comercialId: 'user1',
    gestorId: 'user2',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    nombre: 'Proyecto Beta',
    descripcion: 'Implementación de sistema ERP',
    estado: 'activo',
    fechaInicio: '2024-02-01',
    fechaFin: '2024-11-30',
    presupuesto: 200000,
    comercialId: 'user1',
    gestorId: 'user3',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z'
  },
  {
    id: '3',
    nombre: 'Proyecto Gamma',
    descripcion: 'Migración a la nube',
    estado: 'planificacion',
    fechaInicio: '2024-03-01',
    fechaFin: '2024-10-31',
    presupuesto: 100000,
    comercialId: 'user2',
    gestorId: 'user1',
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2024-03-01T08:00:00Z'
  }
]

// GET /api/proyectos - Obtener todos los proyectos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // En una implementación real, aquí harías la consulta a la base de datos
    // const proyectos = await prisma.proyecto.findMany({
    //   include: {
    //     comercial: true,
    //     gestor: true,
    //     listas: true
    //   }
    // })

    return NextResponse.json(mockProyectos)
  } catch (error) {
    console.error('Error fetching proyectos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/proyectos - Crear nuevo proyecto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validación básica
    if (!body.nombre || !body.descripcion) {
      return NextResponse.json(
        { error: 'Nombre y descripción son requeridos' },
        { status: 400 }
      )
    }

    // En una implementación real, aquí crearías el proyecto en la base de datos
    const nuevoProyecto = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(nuevoProyecto, { status: 201 })
  } catch (error) {
    console.error('Error creating proyecto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}