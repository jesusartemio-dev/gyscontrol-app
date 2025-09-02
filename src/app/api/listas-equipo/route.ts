// ===================================================
// 📁 Archivo: route.ts
// 📌 Descripción: API Route para gestión de listas de equipos
// 🧠 Uso: CRUD de listas técnicas de equipos
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock data for demonstration
const mockListasEquipo = [
  {
    id: '1',
    nombre: 'Lista Equipos Oficina Central',
    descripcion: 'Equipos necesarios para la oficina central del proyecto Alpha',
    codigo: 'LEQ-001',
    estado: 'por_revisar',
    proyectoId: '1',
    responsableId: 'user1',
    numeroSecuencia: 1,
    fechaPedido: '2024-01-20',
    fechaNecesaria: '2024-02-15',
    observaciones: 'Urgente para inicio de proyecto',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    items: [
      {
        id: '1',
        nombre: 'Laptop Dell XPS 13',
        descripcion: 'Laptop para desarrollo',
        cantidad: 5,
        unidad: 'unidades',
        precioUnitario: 1200,
        total: 6000
      },
      {
        id: '2',
        nombre: 'Monitor 24 pulgadas',
        descripcion: 'Monitor secundario',
        cantidad: 5,
        unidad: 'unidades',
        precioUnitario: 300,
        total: 1500
      }
    ]
  },
  {
    id: '2',
    nombre: 'Lista Equipos Servidor',
    descripcion: 'Equipos de servidor para infraestructura',
    codigo: 'LEQ-002',
    estado: 'por_cotizar',
    proyectoId: '1',
    responsableId: 'user2',
    numeroSecuencia: 2,
    fechaPedido: '2024-01-25',
    fechaNecesaria: '2024-03-01',
    observaciones: 'Revisar especificaciones técnicas',
    createdAt: '2024-01-25T09:00:00Z',
    updatedAt: '2024-01-25T09:00:00Z',
    items: [
      {
        id: '3',
        nombre: 'Servidor Dell PowerEdge',
        descripcion: 'Servidor principal',
        cantidad: 2,
        unidad: 'unidades',
        precioUnitario: 5000,
        total: 10000
      }
    ]
  },
  {
    id: '3',
    nombre: 'Lista Equipos Red',
    descripcion: 'Equipos de networking y comunicaciones',
    codigo: 'LEQ-003',
    estado: 'aprobado',
    proyectoId: '2',
    responsableId: 'user3',
    numeroSecuencia: 1,
    fechaPedido: '2024-02-01',
    fechaNecesaria: '2024-02-20',
    observaciones: 'Aprobado por gerencia',
    createdAt: '2024-02-01T08:00:00Z',
    updatedAt: '2024-02-01T08:00:00Z',
    items: [
      {
        id: '4',
        nombre: 'Switch Cisco 24 puertos',
        descripcion: 'Switch principal',
        cantidad: 3,
        unidad: 'unidades',
        precioUnitario: 800,
        total: 2400
      },
      {
        id: '5',
        nombre: 'Router Cisco ISR',
        descripcion: 'Router de borde',
        cantidad: 1,
        unidad: 'unidades',
        precioUnitario: 1500,
        total: 1500
      }
    ]
  },
  {
    id: '4',
    nombre: 'Lista Equipos Móviles',
    descripcion: 'Dispositivos móviles para el equipo',
    codigo: 'LEQ-004',
    estado: 'borrador',
    proyectoId: '2',
    responsableId: 'user1',
    numeroSecuencia: 2,
    fechaPedido: '2024-02-05',
    fechaNecesaria: '2024-02-25',
    observaciones: 'En proceso de definición',
    createdAt: '2024-02-05T11:00:00Z',
    updatedAt: '2024-02-05T11:00:00Z',
    items: []
  },
  {
    id: '5',
    nombre: 'Lista Equipos Seguridad',
    descripción: 'Equipos de seguridad y monitoreo',
    codigo: 'LEQ-005',
    estado: 'por_validar',
    proyectoId: '3',
    responsableId: 'user2',
    numeroSecuencia: 1,
    fechaPedido: '2024-02-10',
    fechaNecesaria: '2024-03-10',
    observaciones: 'Pendiente validación técnica',
    createdAt: '2024-02-10T14:00:00Z',
    updatedAt: '2024-02-10T14:00:00Z',
    items: [
      {
        id: '6',
        nombre: 'Cámara IP Hikvision',
        descripcion: 'Cámara de seguridad',
        cantidad: 8,
        unidad: 'unidades',
        precioUnitario: 200,
        total: 1600
      }
    ]
  },
  {
    id: '6',
    nombre: 'Lista Equipos Rechazada',
    descripcion: 'Lista que fue rechazada por presupuesto',
    codigo: 'LEQ-006',
    estado: 'rechazado',
    proyectoId: '3',
    responsableId: 'user3',
    numeroSecuencia: 2,
    fechaPedido: '2024-02-12',
    fechaNecesaria: '2024-03-15',
    observaciones: 'Rechazado por exceder presupuesto',
    createdAt: '2024-02-12T16:00:00Z',
    updatedAt: '2024-02-12T16:00:00Z',
    items: [
      {
        id: '7',
        nombre: 'Equipo Costoso',
        descripcion: 'Equipo que excede presupuesto',
        cantidad: 1,
        unidad: 'unidades',
        precioUnitario: 50000,
        total: 50000
      }
    ]
  }
]

// GET /api/listas-equipo - Obtener todas las listas de equipos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    let listas = mockListasEquipo

    // Filtrar por proyecto si se especifica
    if (proyectoId) {
      listas = listas.filter(lista => lista.proyectoId === proyectoId)
    }

    // Filtrar por estado si se especifica
    if (estado && estado !== 'todos') {
      listas = listas.filter(lista => lista.estado === estado)
    }

    // En una implementación real, aquí harías la consulta a la base de datos
    // const listas = await prisma.listaEquipo.findMany({
    //   where: {
    //     ...(proyectoId && { proyectoId }),
    //     ...(estado && estado !== 'todos' && { estado })
    //   },
    //   include: {
    //     proyecto: true,
    //     responsable: true,
    //     items: true
    //   },
    //   orderBy: {
    //     createdAt: 'desc'
    //   }
    // })

    return NextResponse.json(listas)
  } catch (error) {
    console.error('Error fetching listas-equipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/listas-equipo - Crear nueva lista de equipos
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
    if (!body.nombre || !body.proyectoId) {
      return NextResponse.json(
        { error: 'Nombre y proyecto son requeridos' },
        { status: 400 }
      )
    }

    // En una implementación real, aquí crearías la lista en la base de datos
    const nuevaLista = {
      id: Date.now().toString(),
      codigo: `LEQ-${String(Date.now()).slice(-3)}`,
      estado: 'borrador',
      numeroSecuencia: 1,
      items: [],
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(nuevaLista, { status: 201 })
  } catch (error) {
    console.error('Error creating lista-equipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}