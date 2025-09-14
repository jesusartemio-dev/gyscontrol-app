// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cliente/import/route.ts
// 🔧 Descripción: API route para importación masiva de clientes
// 🧠 Uso: Maneja la creación masiva de clientes desde Excel
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Validation schema for imported client
const clienteImportSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  ruc: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().optional()
})

const importClientesSchema = z.object({
  clientes: z.array(clienteImportSchema)
})

// 📡 POST - Import multiple clients
export async function POST(request: NextRequest) {
  try {
    // 🔐 Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 🔍 Parse and validate request body
    const body = await request.json()
    const { clientes } = importClientesSchema.parse(body)

    // 📡 Create clients in database
    const creados = []
    
    for (const clienteData of clientes) {
      try {
        const nuevoCliente = await prisma.cliente.create({
          data: {
            nombre: clienteData.nombre,
            ruc: clienteData.ruc || null,
            direccion: clienteData.direccion || null,
            telefono: clienteData.telefono || null,
            correo: clienteData.correo || null
          }
        })
        
        creados.push(nuevoCliente)
      } catch (error) {
        console.error(`Error creating client ${clienteData.nombre}:`, error)
        // Continue with other clients even if one fails
      }
    }

    return NextResponse.json({
      message: `${creados.length} clientes importados exitosamente`,
      creados: creados.length,
      total: clientes.length
    })

  } catch (error) {
    console.error('Error importing clients:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}