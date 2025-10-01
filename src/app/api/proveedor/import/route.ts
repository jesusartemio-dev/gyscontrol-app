// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proveedor/import/route.ts
// 🔧 Descripción: API route para importación masiva de proveedores
// 🧠 Uso: Maneja la creación masiva de proveedores desde Excel
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Validation schema for imported provider
const proveedorImportSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  ruc: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().optional()
})

const importProveedoresSchema = z.object({
  proveedores: z.array(proveedorImportSchema)
})

// 📡 POST - Import multiple providers
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
    const { proveedores } = importProveedoresSchema.parse(body)

    // 📡 Create providers in database
    const creados = []
    
    for (const proveedorData of proveedores) {
      try {
        const nuevoProveedor = await prisma.proveedor.create({
          data: {
            nombre: proveedorData.nombre,
            ruc: proveedorData.ruc || null,
            direccion: proveedorData.direccion || null,
            telefono: proveedorData.telefono || null,
            correo: proveedorData.correo || null
          }
        })
        
        creados.push(nuevoProveedor)
      } catch (error) {
        console.error(`Error creating provider ${proveedorData.nombre}:`, error)
        // Continue with other providers even if one fails
      }
    }

    return NextResponse.json({
      message: `${creados.length} proveedores importados exitosamente`,
      creados: creados.length,
      total: proveedores.length
    })

  } catch (error) {
    console.error('Error importing providers:', error)
    
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
