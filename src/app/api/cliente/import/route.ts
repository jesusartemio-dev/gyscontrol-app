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
  codigo: z.string().min(1, 'El código es obligatorio'), // ✅ Código ahora requerido
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

    // 🔍 Validar códigos únicos antes de crear
    const codigosExistentes = await prisma.cliente.findMany({
      select: { codigo: true }
    })
    const codigosSet = new Set(codigosExistentes.map(c => c.codigo))
    
    const errores: string[] = []
    const creados = []
    
    for (const clienteData of clientes) {
      try {
        // 🔍 Verificar que el código no exista
        if (codigosSet.has(clienteData.codigo)) {
          errores.push(`El código '${clienteData.codigo}' ya existe para el cliente '${clienteData.nombre}'`)
          continue
        }
        
        console.log(`🔢 Creating client with code: ${clienteData.codigo}`)
        console.log('Client data:', JSON.stringify(clienteData, null, 2))
        
        const clientData = {
          codigo: clienteData.codigo,
          numeroSecuencia: 1, // ✅ Inicializar en 1
          nombre: clienteData.nombre,
          ruc: clienteData.ruc || null,
          direccion: clienteData.direccion || null,
          telefono: clienteData.telefono || null,
          correo: clienteData.correo || null
        }
        
        console.log('Prisma create data:', JSON.stringify(clientData, null, 2))
        
        const nuevoCliente = await prisma.cliente.create({
          data: clientData
        })
        
        // Agregar código al set para evitar duplicados en el mismo lote
        codigosSet.add(clienteData.codigo)
        creados.push(nuevoCliente)
      } catch (error) {
        console.error(`❌ Error creating client ${clienteData.codigo}:`, error)
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          cause: error instanceof Error ? error.cause : 'No cause'
        })
        errores.push(`Error al crear cliente ${clienteData.codigo}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return NextResponse.json({
      message: errores.length > 0 
        ? `${creados.length} clientes importados exitosamente, ${errores.length} errores encontrados`
        : `${creados.length} clientes importados exitosamente`,
      creados: creados.length,
      total: clientes.length,
      errores: errores.length > 0 ? errores : undefined
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
